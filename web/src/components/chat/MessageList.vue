<template>
  <div
    ref="scrollContainer"
    class="message-list"
    @scroll="handleScroll"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @wheel="onWheel"
  >
    <div ref="contentRef" class="message-list-content">
      <!-- 对话头部插槽：放在滚动区域内，随消息内容一起滚动 -->
      <slot name="header" />

      <MessageItem
        v-for="msg in messages"
        :key="msg._key || msg.id"
        :message="msg"
        :typing="typing"
        :keyboardHeight='keyboardHeight'
        @action="handleAction"
        @cardClick="handleCardClick"
        @buttonClick="handleButtonClick"
        @feedback="handleFeedback"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * 消息列表滚动容器组件
 *
 * 功能：
 * - 渲染消息列表，支持 header 插槽（如 ConversationHeader）
 * - 新消息/流式输出时自动滚动到底部
 * - 用户手动上滑时暂停自动滚动；下滑/滑回底部时立即恢复跟随
 * - 暴露 scrollToBottom / scrollToTop 方法供父组件调用
 */
import { ref, watch, nextTick, onBeforeUnmount, onMounted } from "vue";
import MessageItem from "./MessageItem.vue";

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
  typing: {
    type: Boolean,
    default: false,
  },
  keyboardHeight: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["action", "cardClick", "buttonClick", "feedback"]);

const scrollContainer = ref(null);
const contentRef = ref(null);
const isAutoScrolling = ref(true);
let programScrolling = false; // 程序滚动锁，防止 scroll 事件误判

/**
 * 用户上滑标记
 *
 * 关键点：不能用 scrollTop 判断方向——打字机跟随态里每帧都把 scrollTop 推到
 * 不断变大的 scrollHeight，scrollTop 被 JS 和用户两边驱动且 JS 占上风，
 * 读它只能得到恒 >= 0 的值，方向失真。
 * 因此改用「手指在视口中的纵向位移」(clientY) / 滚轮 deltaY 判断方向，
 * 手指坐标只由用户控制，免疫程序滚动干扰。
 *
 * 语义收窄为“正在上滑”：拖拽感只发生在上滑（用户往上、JS 往底下拽）。
 * 下滑/滑到底部是恢复跟随的方向，立即解除拦截，无需等待松手。
 */
const isUserScrolling = ref(false);
let userScrollTimer = null;
let touchStartY = null;

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function onTouchMove(e) {
  const y = e.touches[0].clientY;
  handleUserSwipe(y - touchStartY); // 手指上移 < 0
}

function onWheel(e) {
  handleUserSwipe(e.deltaY); // 滚轮上滚 < 0
}

function handleUserSwipe(deltaY) {
  if (deltaY < 0) {
    // 上滑：会跟 JS 抢帧 -> 置位 + 立即断开
    isUserScrolling.value = true;
    disconnectResizeObServer();
    clearTimeout(userScrollTimer);
    userScrollTimer = setTimeout(() => {
      isUserScrolling.value = false;
    }, 150);
  } else {
    // 下滑 / 滑到底部：恢复跟随 -> 立即解除拦截
    isUserScrolling.value = false;
    clearTimeout(userScrollTimer);
  }
}

/**
 * 程序式滚动到底部（路由切换/恢复流式会话时一次性调用，可用平滑动画）
 */
function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      isAutoScrolling.value = true;
      programScrolling = true;
      scrollContainer.value.scrollTo({
        top: scrollContainer.value.scrollHeight,
        behavior: "smooth",
      });
      setTimeout(() => {
        programScrolling = false;
      }, 350);
    }
  });
}

/**
 * 重置滚动位置到顶部（切换/新建会话时调用）
 * 使用 instant 避免视觉上从旧位置滑下来的异常效果
 */
function scrollToTop() {
  if (!scrollContainer.value) return;
  scrollContainer.value.scrollTo({ top: 0, behavior: "instant" });
  // 重置自动滚动标记，确保后续新消息能正常触发自动滚动
  isAutoScrolling.value = true;
}

/**
 * 流式滚动：rAF 合并 + instant 定位
 * 原实现每来一个 token 都触发一次 smooth 滚动动画，移动端会抖动卡顿；
 * 这里用 rAF 把同一帧内的多次触发收敛成一次，并用 scrollTop 直接定位（无动画）。
 */
let streamScrollRaf = null;
function scheduleStreamScroll() {
  if (!isAutoScrolling.value || isUserScrolling.value) return;
  if (streamScrollRaf != null) return;

  streamScrollRaf = requestAnimationFrame(() => {
    streamScrollRaf = null;
    const el = scrollContainer.value;
    if (!el) return;
    if (!isAutoScrolling.value || isUserScrolling.value) return;
    // 强制同步 reflow：让浏览器此刻基于最新 DOM 重新计算布局
    // void el.offsetHeight;

    // 此时 scrollHeight 一定是最新值
    programScrolling = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      programScrolling = false;
    });
  });
}
  
  // streamScrollRaf = requestAnimationFrame(() => {
  //   streamScrollRaf = null;
  //   const el = scrollContainer.value;
  //   if (el && isAutoScrolling.value && !isUserScrolling.value) {
  //     programScrolling = true;
  //     el.scrollTop = el.scrollHeight;
  //     // DOM scroll 事件在下一帧触发，延迟解锁
  //     requestAnimationFrame(() => {
  //       programScrolling = false;
  //     });
  //   }
  // });
// }

/**
 * 链接/断开 ResizeObserver 的辅助函数
 */
let resizeObserver = null;
function connectResizeObServer() {
  if (!resizeObserver && contentRef.value && props.typing) {
    resizeObserver = new ResizeObserver(() => {
      scheduleStreamScroll();
    });
    resizeObserver.observe(contentRef.value);
  }
}

function disconnectResizeObServer() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

/**
 * 监听滚动事件（rAF 节流）
 * 负责“回到最底部 -> 重连高度监听”。读 scrollHeight 会 reflow，故节流。
 * 下滑时 isUserScrolling 已被 handleUserSwipe 清成 false，这里条件可正常满足。
 */
let scrollDetectRaf = null;
function handleScroll() {
  if (programScrolling) return; // 程序触发的滚动，直接忽略
  if (scrollDetectRaf != null) return;
  scrollDetectRaf = requestAnimationFrame(() => {
    scrollDetectRaf = null;
    const el = scrollContainer.value;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 30 ;
    isAutoScrolling.value = atBottom;
    // 用户滑回底部（打字机可能还在运行，且不在上滑中）-> 重连高度监听
    if (atBottom && !isUserScrolling.value && props.typing) {
      connectResizeObServer();
    }
  });
}
/** 流状态本地缓存: 避免 handleScroll 高频访问 props.messages */
const isStreaming = ref(false);

/**
 * 单一 watcher：合并原三个 watcher（length / content）
 * 优化点：
 *  1. 去掉 { deep: true }（浅比较即可，deep 会递归遍历全部消息）
 *  2. 只跟踪 [消息总数, 末条消息 content 长度]
 *     —— 仅在「新增消息 / 流式内容增长」时触发一次 rAF 滚动
 */
watch(
  () => {
    const list = props.messages;
    const len = list.length;
    const last = len ? list[len - 1] : null;
    return [len, last ? last.content.length : 0, last?.status || ""];
  },
  ([newLen, newLen2, newStatus], [oldLen, oldLen2, oldStatus]) => {
    // 内容增长或新增消息 -> 触发滚动
    if (newLen !== oldLen || newLen2 !== oldLen2) {
      setTimeout(()=>{
        scheduleStreamScroll();
      },100)
    }
    // 流状态变化 -> 管理 ResizeObserver
    if (newStatus !== oldStatus) {
      isStreaming.value = newStatus === "streaming";
      // 注意: 不在 status = done 时断开 ResizeObServer
      // 因为打字机效果可能还在运行, 内容高度仍在变化
      // ResizeObServer 会在内容停止变化时自然停止触发
      if (newStatus === "streaming" && isAutoScrolling.value && !isUserScrolling.value) {
        connectResizeObServer();
      }
    }
  }
);
// 组件挂载后初始化流状态, 并在打字机模式且用户在底部时启用 ResizeObServer
onMounted(() => {
  const last = props.messages.length ? props.messages[props.messages.length - 1] : null;
  isStreaming.value = last?.status === "streaming";
  if (props.typing && isAutoScrolling.value) {
    connectResizeObServer();
  }
});

// 监听 typing 模式切换, 动态启用/禁用 resizeObserver
watch(
  () => props.typing,
  (newTyping) => {
    if (newTyping && isAutoScrolling.value  && !isUserScrolling.value) {
      connectResizeObServer();
    } else if (!newTyping) {
      disconnectResizeObServer();
    }
  }
);

// 组件卸载前清理未执行的 rAF / 定时器，避免泄漏
onBeforeUnmount(() => {
  if (streamScrollRaf != null) cancelAnimationFrame(streamScrollRaf);
  if (scrollDetectRaf != null) cancelAnimationFrame(scrollDetectRaf);
  clearTimeout(userScrollTimer);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

defineExpose({
  scrollToBottom,
  scrollToTop,
});

/**
 * 处理消息操作（点赞、踩、复制）
 */
function handleAction(event) {
  emit("action", event);
}

/**
 * 处理卡片点击
 */
function handleCardClick(card) {
  emit("cardClick", card);
}

/**
 * 处理按钮点击
 */
function handleButtonClick(btn) {
  emit("buttonClick", btn);
}

function handleFeedback(data) {
  emit("feedback", data);
}
</script>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 105px 12px 20px 12px;
  /* background: linear-gradient(180deg, #f6f5f5 58%, #f3f3f700 100%) !important; */
  /* padding-bottom: calc(16px + env(safe-area-inset-bottom)); */
  /* padding-bottom: 100px; */
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 可见区域(~85vh) - ConversationHeader(~150px) - padding(120px) ≈ 40vh，保证空状态不触发滚动 */
  min-height: 20vh;
  color: #9ca3ad;
  font-size: 14px;
}
</style>