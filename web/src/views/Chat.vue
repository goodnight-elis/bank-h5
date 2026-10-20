<template>
  <div
    class="chat-page"
    :class="{ 'keyboard-up': keyboardHeight > 0 }"
    :style="chatPageStyle"
    @touchstart="onPageTouchStart"
    @touchmove="onPageTouchMove"
    @touchend="onPageTouchEnd"
  >
    <!-- 顶部导航栏 -->
    <AgentHeader
      ref="agentHeaderRef"
      :show-history-capsule="showHistoryCapsule"
      @close="handleBack"
      @clickHistoryCapsule="handleClickHistoryCapsule"
    />

    <!-- 对话视图 -->
    <!-- <div
      class="current-chat-view"
      :style="{ paddingBottom: neeedPaddingBottom + 'px' }"
    >

    </div> -->
    <MessageList
      ref="messageListRef"
      :messages="chatStore.currentMessages"
      @action="handleMessageAction"
      :typing="typingMode"
      :keyboardHeight='keyboardHeight'
      @cardClick="handleCardClick"
      @buttonClick="handleButtonClick"
      @feedback="handleFeedback"
    >
      <template #header>
        <ConversationHeader />
      </template>
    </MessageList>
    <!-- 快捷胶囊 -->
    <div class="input-box">
      <SuggestionChips
        v-if="currentChips.length"
        :chips="currentChips"
        @select="handleSelectChip"
      />

      <!-- 底部输入区域 -->
      <AgentInput
        v-model="inputValue"
        :interrupt="currentInterrupt"
        :is-streaming="chatStore.isStreaming"
        @voiceClick="handleVoiceInput"
        @send="handleSend"
        @interruptSelect="handleInterruptSelect"
        @interruptConfirm="handleInterruptConfirm"
        @interruptSkip="handleInterruptSkip"
        @interruptClose="handleInterruptClose"
        @stop="handleStop"
        @inputHeightChange="handleInputHeightChange"
        @filesChange="handleFilesChange"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * AI 智能体对话 H5 页面
 *
 * 核心功能：
 * - 对话：消息收发（SSE 流式）、备选答案、快捷胶囊、输入框
 * - 历史对话胶囊：显示"历史对话"，点击跳转到上一期会话页
  * - 抽屉菜单：新建对话、报告历史、对话历史列表（长按编辑/删除）
 */
import { ref, watch, computed, nextTick, onUnmounted, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  generateAppRouteUrl,
  jumpChatBIApp,
  getTypeLabel,
} from "@/utils/common";
import { showToast } from "vant";
import AgentHeader from "../components/agent/AgentHeader.vue";
import AgentInput from "../components/agent/AgentInput.vue";
import SuggestionChips from "../components/agent/SuggestionChips.vue";
import MessageList from "../components/chat/MessageList.vue";
import ConversationHeader from "../components/chat/ConversationHeader.vue";
import { useChatStore } from "../stores/chat";
import { useAppStore } from "../stores/app";
import {
  getPreviousSession,
  getChips,
  submitFeedback,
  getGuidance,
} from "../api/chat";

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const appStore = useAppStore();
const messageListRef = ref(null);
const agentHeaderRef = ref(null);
const inputValue = ref("");
const inputBarHeight = ref(118);
const uploadedFiles = ref([]);
const previousSession = ref(null);
const fetchedChips = ref([]); // 功能胶囊（HTTP 接口获取）
const source = ref(route.query.source || "");
const linkedpreVisitPeported = ref(route.query.reportId || "");
const watchIoskeyBoardHeight = () => {
  window.scrollTo(0, 0);
  const bridge = window.pluginHelper?.device;
  if (!bridge?.getKeyboardHeight) return;
  try {
    bridge.getKeyboardHeight(
      (success) => {
        console.log('watchIoskeyBoardHeight',success); //success为回调成功后返回的结果
        const h = Number(success.keyboardHeight) || 0;
        if (h > 0) {
            console.log('watchIoskeyBoardHeight','setTimeout',h)
            keyboardHeight.value = h
            appStore.setKeyboardHeightIOS(keyboardHeight.value)
        };
      },
      (failure) => {
        console.log(failure); //failure为回调失败后返回的结果
      }
    );
  } catch (error) {
    console.log(error)
  }
};

onMounted(() => {
  fetchChips();
  if (appStore.isIOS) {
    watchIoskeyBoardHeight(); // 监听键盘高度
    document.addEventListener("focusin", onKeyboardFocusIn);
    document.addEventListener("focusout", onKeyboardFocusOut);
  }
});
// 组件卸载时不再停止流式输出，让 SSE 在后台继续
// H5 页面关闭时由 store 的 pagehide 事件统一终止所有连接
onUnmounted(() => {
  if (appStore.isIOS) {
    document.removeEventListener("focusin", onKeyboardFocusIn);
    document.removeEventListener("focusout", onKeyboardFocusOut);
    clearTimeout(kbQueryTimer);
    clearTimeout(kbResetTimer);
  }

  // 不再调用 chatStore.stop()，SSE 连接在后台继续接收数据
  // 页面内路由跳转（如 /chat → /report-history）不会触发 pagehide
  // 只有真正关闭 H5 页面时才会终止所有 SSE 连接
});

/**
 * IOS 键盘避让(仅IOS生效)
 *
 * 背景: WKWebView 键盘弹起时原生 scrollView 调整 contentInset
 * 把整个页面上推, 导致AgentHeader / MessageList 也被推出屏幕
 * 方案:
 *   1. focusin 后分段执行 window.scrollTo(0,0) 抵消原生上推
 *   2. 等待键盘动画结束后, 通过原生桥getKeyboardHeight 获取真实键盘高度
 *   3. 将.chat-page 高度收缩为100% - 键盘高度, MessageList 因flex:1
 *      被动态压缩, agentHeader (absolute top:0) 保持顶部不动,
 *      输入框自然后落在键盘正上方
 */
const keyboardHeight = ref(0); //键盘高度
let kbQueryTimer = null; // focus 后延迟查询键盘高度的定时器
let kbResetTimer = null; // blur 后延迟归零的定时器

/** 只处理IOS 键盘弹起时收缩页面高度, 压缩MessageList */
const chatPageStyle = computed(() => {
  if (keyboardHeight.value > 0 && appStore.isIOS) {
    return { height: `calc(100% - ${keyboardHeight.value}px)` };
  }
  return {};
});
/**键盘高度变化后滚动到底, 保证最新消息可见 */
const oldKeyboardHeight = ref(0);
watch(keyboardHeight, (newVal, oldVal) => {
  console.log(newVal, oldVal)
  if (appStore.isIOS) {
    // 9键和26键切换保留值, 为切换后第一次点击键盘唤起保留高度
    oldKeyboardHeight.value = oldVal;
    nextTick(() => {
      // 处理内容高度计算下不来问题
      setTimeout(()=>{
        window.scrollTo(0, 0);
        messageListRef.value?.scrollToBottom();
      },300)
    });
  }
});
/** 是否点击的是input */
function isTextInput(el) {
  const tag = el?.tagName;
  return (tag === "INPUT" || tag === "TEXTAREA");
}
/**
 * 判断是否失焦, 处理唤醒语音,返回ios键盘高度
 */
const isBlur = ref(false);
/*** 输入框聚焦: 键盘即将弹起 */
function onKeyboardFocusIn(e) {
  //通过input或textarea标签属性id=nokeyboardinput  判断是否需要计算高度
  if (isTextInput(e.target) && e.target.getAttribute('id') === 'nokeyboardinput') return;
  //  判断是否为IOS和聚焦标签
  if ((!appStore.isIOS || !isTextInput(e.target))) return;
  isBlur.value = false;
  console.log('onKeyboardFocusIn+++++++++++++')
  clearTimeout(kbResetTimer);
  // 分段抵消原生上推(键盘动画期间原生可能多次调整 contentInset)
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 100);
  clearTimeout(kbQueryTimer);
  // IOS 键盘弹出动画约 250 - 300ms,延迟后再向原生查询真实高度
  kbQueryTimer = setTimeout(() => {
    try {
      window.scrollTo(0, 0);
      const bridge = window.pluginHelper?.device;
      if (!bridge?.getKeyboardHeight) return;
      try {
        // 因9键换26键等问题, 无法获取键盘高度 兼容
        if (oldKeyboardHeight.value > 0) {
          keyboardHeight.value = JSON.parse(
            JSON.stringify(oldKeyboardHeight.value || 380)
          );
          appStore.setKeyboardHeightIOS(keyboardHeight.value)
        }  
        console.log(keyboardHeight.value,'keyboardHeight.value')  
        bridge.getKeyboardHeight(
          (success) => {
            console.log('onKeyboardFocusIn',success); //success为回调成功后返回的结果
            // 如果失去焦点了,不再赋值;
            console.log(isBlur.value,'isBlur.value')
            if(isBlur.value) return;
            const h = Number(success.keyboardHeight) || 0;
            if (h > 0) {
              keyboardHeight.value = h;
              appStore.setKeyboardHeightIOS(keyboardHeight.value)
            }  
          },
          (failure) => {
            console.log(failure); //failure为回调失败后返回的结果
          }
        );
      } catch (error) {
        keyboardHeight.value = 380;
      }
    } catch (error) {
      keyboardHeight.value = 380;
    }
  }, 350);
}

/** 输入框失焦: 键盘即将收起 */
function onKeyboardFocusOut(e) {
  if (!appStore.isIOS || !isTextInput(e.target)) return;
  // 已失焦, 去获取键盘高度里处理判断是否赋值
  isBlur.value = true;
  console.log('失焦')
  clearTimeout(kbQueryTimer);
  clearTimeout(kbResetTimer);
  // 延迟归零: 输入框之间切换时新的focuesin会取消该重置, 避免抖动
  // 键盘手气动画较快, 100ms 足够区分真实收起与焦点切换
  kbResetTimer = setTimeout(() => {
    keyboardHeight.value = 0;
    appStore.setKeyboardHeightIOS(keyboardHeight.value)
    window.scrollTo(0, 0);
  }, 100);
}

/** 是否显示历史对话胶囊：有上一期会话 且 当前是新对话页或首次对话页 */
const showHistoryCapsule = computed(() => {
  if (route.params.id) return false;
  return !!previousSession.value;
});
/** 是否是打字机效果 */
const typingMode = computed(() =>{
  return  chatStore.isHistoryView || false
});

/** 快捷胶囊（HTTP 接口获取，interrupt 期间隐藏） */
const currentChips = computed(() => {
  const session = chatStore.currentSession;
  if (session?.interrupt) return []; // interrupt 期间隐藏
  return fetchedChips.value;
});
// const neeedPaddingBottom = computed(() => {
//   console.log(">>>>neeedPaddingBottom");
//   if (currentChips.value && currentChips.value.length) {
//     return inputBarHeight.value + 40;
//   } else {
//     return inputBarHeight.value + 12;
//   }
// });

// watch(neeedPaddingBottom, () => {
//   nextTick(() => {
//     console.log(messageListRef.value, "messageListRef.value");
//     messageListRef.value?.scrollToBottom();
//   });
// });

/** 当前 interrupt 状态 */
const currentInterrupt = computed(() => {
  const session = chatStore.currentSession;
  return session?.interrupt || null;
});

/**
 * 监听路由变化，设置会话 ID
 */
watch(
  () => route.params.id,
  async (newId) => {
    let sessionId;
    if (newId) {
      // 有会话 ID，切换到该会话（不存在则自动创建）
      sessionId = newId;
      chatStore.setSessionId(sessionId);

      // 切回流式中的会话时，不加载历史，保留 SSE 闭包引用
      if (!chatStore.isStreaming) {
        await chatStore.loadHistory();
      }
    } else {
      // 无会话 ID（/chat 路径），调用后端接口创建新会话
      // 跳转来源 source   报告id linkedpreVisitPeported
      console.log("到这了");

      sessionId = await chatStore.createSession(
        source.value,
        linkedpreVisitPeported.value
      );
      if (sessionId) {
        const text = await getGuidance(sessionId);
        console.log("提示初始化", text);
        const session = chatStore.currentSession;
        if (!session || session.messages.length > 0) return;
        session.messages.push({
          id: `assistant-welcome-${Date.now()}`,
          sessionId,
          role: "assistant",
          content: text,
          attachments: [],
          status: "done",
          isWelcome: true,
          createdAt: Date.now(),
        });
      }
      if (chatStore.currentSessionId) {
        await fetchPreviousSession();
      }
      // 新对话模式, 开启打字机
      chatStore.isHistoryView = true;
    }

    // 流式中切回直接滚动到底部，否则重置到顶部
    nextTick(() => {
      if (newId || chatStore.isStreaming) {
        messageListRef.value?.scrollToBottom();
      } else {
        messageListRef.value?.scrollToTop();
      }
    });
  },
  { immediate: true }
);

/**
 * 处理输入框高度变化，动态调整对话区域底部间距
 */
function handleInputHeightChange(height) {
  inputBarHeight.value = height;
  messageListRef.value?.scrollToBottom();
}
/**
 * 处理文件列表变化
 */
function handleFilesChange(files) {
  uploadedFiles.value = files;
}

/**
 * 处理发送消息（输入框 → 流式模式）
 * @param {Array} attachments - 附件列表（由 AgentInput 传入）
 */
function handleSend(attachments = []) {
  if (!inputValue.value.trim() && uploadedFiles.value.length === 0) return;
    // 用户提交新消息后, 退出历史对话查看模式, 重新开启打字机
    chatStore.isHistoryView = true;
  // interrupt 模式下，输入发送走 resumeInterrupt
  if (chatStore.currentSession?.interrupt) {
    chatStore.resumeInterrupt({
      qa_index: chatStore.currentSession.interrupt.qa_index,
      answer: inputValue.value,
    });
    inputValue.value = "";
    return;
  }
  // 正常模式
  const fileIds = uploadedFiles.value
    .filter((f) => f.fileId)
    .map((f) => f.fileId);
  chatStore.send(inputValue.value, fileIds, attachments);
  inputValue.value = "";
  nextTick(() => {
    messageListRef.value.scrollToBottom();
  });
}
/**
 * 处理语音输入
 */
function handleVoiceInput(type) {
  // type true是录音，false是取消录音
  if (type) {
    window.pluginHelper.device.speechInput(
      function (data) {
        console.log("语音输出文字", data);
        if (!data.result) {
          showToast("未识别到文本, 请重试");
          return;
        }
        if (chatStore.currentSession?.interrupt) {
          chatStore.resumeInterrupt({
            qa_index: chatStore.currentSession.interrupt.qa_index,
            answer: data.result,
          });

          return;
        }
        chatStore.send(data.result);
        nextTick(() => {
          messageListRef.value.scrollToBottom();
        });
      },
      function (data) {
        console.log(data, "语音fail");
        if (!data?.message) return;
        showToast(data?.message);
      },
      function (data) {}
    );
  } else {
    console.log("录音结束");
  }

  // showToast("语音输入功能开发中");
}

/**
 * 处理选择备选答案
 */
/**
 * 拉取功能胶囊（HTTP 接口）
 */
async function fetchChips() {
  try {
    const res = await getChips(chatStore.currentSessionId);
    // fetchedChips.value = Array.isArray(res) ? res : (res?.data || [])
    fetchedChips.value = res || [];
  } catch (err) {
    console.error("[Chat] 获取功能胶囊失败:", err);
    fetchedChips.value = [];
  }
}

/**
 * 处理选择快捷胶囊（胶囊 → 普通模式）
 */
function handleSelectChip(chip) {
  //快捷胶囊开启打字机效果
  chatStore.isHistoryView = true;
  const text = typeof chip === "string" ? chip : chip.value || chip.label;
  if (chatStore.isStreaming) return;
  chatStore.send(text);
  nextTick(()=>{
    messageListRef.value?.scrollToBottom();
  })
}

/**
 * 处理 interrupt 单选
 */
function handleInterruptSelect(data) {
  chatStore.resumeInterrupt({ qa_index: data.qa_index, answer: data.value });
}

/**
 * 处理 interrupt 多选确认
 */
function handleInterruptConfirm(data) {
  chatStore.resumeInterrupt({ qa_index: data.qa_index, answer: data.answer });
}

/**
 * 处理 interrupt 跳过
 */
function handleInterruptSkip(data) {
  chatStore.skipInterrupt(data.qa_index);
}

/**
 * 处理 interrupt 关闭
 */
function handleInterruptClose(data) {
  chatStore.closeInterrupt(data.qa_index);
}

/**
 * 处理停止生成
 */
function handleStop() {
  chatStore.stop();
}

/**
 * 处理返回
 * - 当前会话页：返回上一页
 * - 其他历史会话页：返回当前会话页（而非浏览器后退）
 */
function handleBack() {
  // const currentId = route.params.id;
  // const targetId = chatStore.currentSessionId;
  // if (currentId && targetId && currentId !== targetId) {
  //   router.push(`/chat/${targetId}`);
  // } else {
  //   router.back();
  // }
  window.pluginHelper.device.closeWebView();
}

/**
 * 处理胶囊点击：跳转到上一期会话页
 */
function handleClickHistoryCapsule() {
  if (!previousSession.value?.id) return;
  router.push(`/chat/${previousSession.value.id}`);
}

/**
 * 获取上一期会话
 */
async function fetchPreviousSession() {
  try {
    const res = await getPreviousSession(
      chatStore.userId,
      chatStore.currentSessionId
    );
    // request.js 已统一处理错误，这里只需要验证返回数据
    // 兼容两种返回格式：id 或 session_id
    if (res && (res.id || res.session_id)) {
      previousSession.value = {
        id: res.id || res.session_id,
      };
    } else {
      previousSession.value = null;
    }
  } catch (err) {
    console.error("[Chat] 获取上一期会话失败:", err);
    previousSession.value = null;
    // 错误已在 request.js 中统一提示
  }
}

/**
 * 处理卡片点击 -> 跳转全屏阅读
 */
function handleCardClick(payload) {
  console.log("[Chat] 卡片点击:", payload);
  if (payload?.reportId) {
    router.push({
      path: "/markdown-view",
      query: {
        reportId: payload.card.reportId || payload.reportId,
        title: getTypeLabel(payload.card.reportType),
        reportType: payload.card.reportType,
        Source: "chat",
      },
    });
  } else {
    showToast("报告id不存在，请稍后重试");
    return;
  }
}
/**
 * 处理按钮点击 -> 根据数据解析跳转 url
 */
function handleButtonClick(data) {
  console.log("[Chat] 按钮点击:", data);
  if (data.action === "interrupt-skip") {
    chatStore.skipInterrupt(data.qa_index);
    return;
  }
  if (data.action === "interrupt-close") {
    chatStore.closeInterrupt(data.qa_index);
    return;
  }
  //app跳转 判断桥方法是否存在
  if (window.pluginHelper?.device?.openWebView) {
    const params = generateAppRouteUrl(data);
    console.log("url:", params);
    jumpChatBIApp(params);
  } else {
    console.log("桥js缺失,app_route跳转失败！");
  }
}

/**
 * 处理反馈提交
 */
async function handleFeedback(data) {
  console.log("[Chat] 反馈提交:", data);
  // 更新消息的 actions 状态（父组件负责维护）
  const session = chatStore.currentSession;
  const msg = session?.messages.find((m) => m.id === data.messageId);
  if (msg) {
    if (!msg.actions) msg.actions = {};
  }
  try {
    if (msg.actions?.dislike) {
      //已反馈， 取消反馈
      const result = await submitFeedback({
        messageId: data.messageId,
        fbk_liked: null,
        user_id: chatStore.userId,
        fbk_comment: null,
      }).catch(() => {
        msg.actions.like = false;
        msg.actions.dislike = false;
      });
      if (result?.id) {
        msg.actions.like = false;
        msg.actions.dislike = false;
        showToast("取消反馈");
      }
    } else {
      const result = await submitFeedback({
        messageId: data.messageId,
        fbk_liked: 0,
        user_id: chatStore.userId,
        fbk_comment: data.detail,
      }).catch(() => {
        msg.actions.like = false;
        msg.actions.dislike = false;
      });
      if (result?.id) {
        msg.actions.like = false;
        msg.actions.dislike = true;
        showToast("反馈提交成功");
      }
    }
  } catch (err) {
    console.error("[Chat] 反馈提交失败:", err);
    showToast("反馈提交失败");
  }
}
async function handleMessageAction(event) {
  console.log("[Chat] 消息操作:", event);
  // 可以在这里添加后端API调用逻辑
  // 例如：保存用户点赞/踩的反馈到服务器
  const { messageId, actionType, actions, sessionId } = event;
  if (actionType === "copy") {
    showToast("已复制到剪贴板");
  } else if (actionType === "like") {
    const data = chatStore.currentMessages.find(
      (item) => item.id === messageId
    );
    if (!actions?.like) {
      const result = await submitFeedback({
        messageId: messageId,
        fbk_liked: 1,
        user_id: chatStore.userId,
      }).catch(() => {
        data.actions.like = false;
        data.actions.dislike = false;
      });
      if (result?.id) {
        data.actions.like = true;
        data.actions.dislike = false;
        showToast("已点赞");
      }
    } else {
      const result = await submitFeedback({
        messageId: messageId,
        fbk_liked: null,
        user_id: chatStore.userId,
      }).catch(() => {
        data.actions.like = false;
        data.actions.dislike = false;
      });
      if (result?.id) {
        data.actions.like = false;
        data.actions.dislike = false;
        showToast("已取消点赞");
      }
    }
  }
}

/**
 * 左边缘右滑打开抽屉手势
 */
const EDGE_ZONE = 30; // 左边缘触发区域（px）
const SWIPE_THRESHOLD = 60; // 滑动阈值（px）
let pageTouchStartX = 0;
let pageTouchStartY = 0;
let pageSwiping = false;

function onPageTouchStart(e) {
  const touch = e.touches[0];
  // 仅从左边缘开始追踪
  if (touch.clientX < EDGE_ZONE) {
    pageTouchStartX = touch.clientX;
    pageTouchStartY = touch.clientY;
    pageSwiping = true;
  }
}

function onPageTouchMove(e) {
  if (!pageSwiping) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - pageTouchStartX;
  const deltaY = touch.clientY - pageTouchStartY;
  // 水平滑动为主且右滑时，阻止纵向滚动
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
    e.preventDefault();
  }
}

function onPageTouchEnd(e) {
  if (!pageSwiping) return;
  pageSwiping = false;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - pageTouchStartX;
  const deltaY = touch.clientY - pageTouchStartY;
  // 右滑超过阈值且水平位移大于垂直位移，打开抽屉
  if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
    agentHeaderRef.value?.openDrawer();
  }
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  padding-top: constant(safe-area-inset-top);
  position: relative;
  padding-top: env(safe-area-inset-top);
}
.input-box {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  /* box-sizing: border-box; */
  flex-direction: column;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background: linear-gradient(180deg, #f7f8fa 0%, #F9EFE7 93%);
}

/* 键盘抬起时,输入框直接贴住键盘顶部, 不留底部空白 */
.chat-page.keyboard-up .input-box {
  padding-bottom: 0;
}
:deep(.current-chat-view) {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  /* padding-top: 107px; */
  /* padding-top: 107px; */
  /* 顶部2个图标展位：图标底边 = safe - top + 20 +41 */
  padding-top: calc(constant(safe-area-inset-top) + 69px);
  padding-top: calc(env(safe-area-inset-top) + 69px);
  overflow-y: auto;
  background: linear-gradient(180deg, #f6f5f5 58%, #f3f3f700 100%) !important;
}
</style>
