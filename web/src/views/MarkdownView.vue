<template>
  <div class="md-page">
    <!-- 顶部导航栏 -->
    <div class="md-header">
      <button class="back-btn" @click="handleBack">
        <img
          src="/src/assets/back-btn.png"
          alt=""
          style="width: 24px; height: 24px"
        />
      </button>
      <h1 class="header-title">{{ title }}</h1>
    </div>

    <!-- 加载状态 -->
    <div class="md-loading" v-if="loading">
      <van-loading type="spinner" color="#ff6b35"></van-loading>
    </div>

    <!-- Markdown 内容 -->
    <!-- :class="{ 'jump-btn': reportType == 'pre_visitreport' }" -->
    <div class="md-content-wrapper" v-else>
      <MarkdownRenderer
        :reportNoContent="reportNoContent"
        :content="content"
        full-page
      />
    </div>
    <!-- <div class="fotter" v-if="reportType == 'pre_visitreport'">
      <van-button
        @click="createChat"
        class="jump-chat"
        type="primary"
        color="#FF7538"
        round
        block
        >写拜访纪要</van-button
      >
    </div> -->
    <!-- 右侧目录悬浮按钮 -->
    <van-floating-bubble
      v-model:offset="bubbleOffset"
      :offset="initialOffset"
      @click="showPopup = !showPopup"
      axis="xy"
      :gap="0"
      magnetic="x"
      class="my-bubble"
    >
      <div
        :class="[
          'bubble-inner',
          isOnLeft
            ? 'bubble--left'
            : isOnRight
            ? 'bubble--right'
            : 'bubble-darg',
        ]"
        ref="myFloatBubble"
      >
        <img class="bubble-img" src="@/assets/mulu.png" alt="目录" />
        <div class="bubble-text">目录</div>
      </div>
    </van-floating-bubble>

    <!-- 底部弹出层组件 -->
    <van-popup
      v-model:show="showPopup"
      position="bottom"
      round
      closeable
      close-icon-position="top-right"
      :style="{ height: '30vh' }"
      safe-area-inset-bottom
      lock-scroll
      overlay
    >
      <div class="popup-container">
        <!-- 弹窗头部标题 -->
        <van-nav-bar title="目录" />

        <!-- 主体内容区域，使用折叠面板展示目录层级 -->
        <div class="popup-content">
          <div class="survey-card-container">
            <van-cell-group inset class="survey-card-group">
              <van-cell
                v-for="(item, index) in tocList"
                :key="index"
                @click="showtip(item.text, index)"
                class="survey-cell"
              >
                <template #icon>
                  <div class="cell-index">{{ index + 1 }}</div>
                </template>
                <template #title>
                  <span class="cell-title">{{ item.text }}</span>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { useRouter, useRoute } from "vue-router";
import MarkdownRenderer from "../components/common/MarkdownRenderer.vue";
import { showToast } from "vant";
import { useChatStore } from "@/stores/chat";
import { useUserInfo } from "@/stores/user";
import { getReportMarkDown } from "@/api/markdown.js";
import axios from "axios";
const chatStore = useChatStore();
const userStore = useUserInfo();
// app跳转获取 URL 参数并解码
const params = new URLSearchParams(window.location.search);
const title = ref(decodeURIComponent(params.get("title")));

/**
 * Markdown 全屏展示页面
 *
 * 支持三种模式：
 * 1. 静态模式：通过 route.query.content 传递完整内容
 * 2. 流式模式：通过 route.query.messageId 绑定当前流式消息，实时逐字更新
 * 3. reportId 获取模式：通过 route.query.reportId 文件二进制流获取文件  reportId=21321312&Source=appMessage
 *
 * 路由参数：
 * - title: 页面标题
 * - content: Markdown 内容（静态模式）
 * - messageId: 消息 ID（流式模式，从 chatStore 读取响应式内容）
 * - reportId: Markdown 文件二进制流获取文件
 *
 * 使用示例：
 * // 静态模式
 * router.push({ path: '/markdown-view', query: { title: '报告', content: '# 标题' } })
 *
 * // 流式模式（绑定正在流式输出的消息）
 * router.push({ path: '/markdown-view', query: { title: '报告', messageId: aiMsg.id } })
 *
 * // reportId 获取模式（从后端文件地址拉取 markdown）
 * router.push({ path: '/markdown-view', query: { title: '报告', reportId: '13214564654', reportType } })
 */
// 控制弹窗显示与隐藏
const showPopup = ref(false);
// 当前高亮的目录项索引
const activeIndex = ref(-1);
const router = useRouter();
const route = useRoute();
const reportType = ref(route.query.reportType); // 访前报告类型
const source = ref(route.query.Source); // 访前报告跳转来源
const loading = ref(false);
const fetchedContent = ref("");

let initialOffset = { x: 0, y: 400 };
const bubbleOffset = ref({ ...initialOffset });
const myFloatBubble = ref(null);
const menuWidth = ref(0);
const isOnLeft = computed(() => {
  // const midX = window.innerWidth / 2;
  // return bubbleOffset.value.x < midX;
  return bubbleOffset.value.x < 10;
});
const isOnRight = computed(() => {
  return window.innerWidth - bubbleOffset.value.x - menuWidth.value < 10;
});
/**
 * 响应式内容：
 * - 如果传了 messageId，从 chatStore 读取当前消息的 content（流式更新）
 * - 如果传了 reportId，使用 fetch 获取的内容
 * - 否则使用 route.query.content（静态内容）
 */
const content = computed(() => {
  const messageId = route.query.messageId;
  if (messageId) {
    // 流式模式：从当前会话消息中查找
    const msg = chatStore.currentMessages.find((m) => m.id === messageId);
    return msg?.content || "";
  }
  const reportId = route.query.reportId;
  if (reportId) {
    return fetchedContent.value || "";
  }
  // 静态模式
  return history.state?.content || route.query.content || "";
});

/**
 * 写拜访纪要  跳转到chat 传参
 */
const createChat = () => {
  if (source.value === "appMessage" && reportType.value === "pre_visitreport") {
    router.replace({
      path: "/chat",
      query: {
        source: "pre_visitreport",
        reportId: route.query.reportId,
      },
    });
    return;
  }
  router.push({
    path: "/chat",
    query: {
      source: "pre_visitreport",
      reportId: route.query.reportId,
    },
  });
};
/**
 * 从 markdown 内容中提取 h2 标题作为目录
 */
const tocList = computed(() => {
  if (!content.value) return [];
  const matches = content.value.matchAll(/^## (.+)$/gm);
  return Array.from(matches).map((m) => {
    // 去除开头的数字
    const text = m[1].trim().replace(/^\d+\s*/, "");
    return { text };
  });
});

// 加载失败内容判断
const reportNoContent = ref(false);

/**
 * 页面挂载时，如果传了 fileUrl 则自动拉取 markdown 内容
 */
onMounted(async () => {
  const reportId = route.query.reportId;
  if (!reportId) {
    showToast("报告id不存在");
    return;
  }
  if (myFloatBubble.value) {
    menuWidth.value = myFloatBubble.value.offsetWidth;
    initialOffset = { x: menuWidth.value, y: 400 };
  }
  loading.value = true;
  getReportMarkDown(reportId)
    .then(async (res) => {
      if (res.content) {
        fetchedContent.value = await res.content;
      } else {
        reportNoContent.value = true;
      }
    })
    .catch((err) => {
      console.error("获取报告文件失败:", err);
      reportNoContent.value = true;
    })
    .finally(() => {
      loading.value = false;
    });
});

function handleBack() {
  if (source.value === "appMessage") {
    window.pluginHelper?.device?.closeWebView &&
      window.pluginHelper.device.closeWebView();
    return;
  } else if (source.value === "chat" && chatStore.currentSessionId) {
    router.replace(`/chat/${chatStore.currentSessionId}`);
    return;
  }
  router.back();
}

function showtip(id, index) {
  activeIndex.value = index;
  scrollToHeading(id);
  showPopup.value = false;
}

function scrollToHeading(text) {
  // 通过文本内容查找对应的 h2 标题（模糊匹配/包含匹配）
  const headings = document.querySelectorAll(".markdown-body h2");
  const target = Array.from(headings).find((h) =>
    h.textContent.trim().includes(text)
  );
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
</script>

<style scoped>
.bubble-darg {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
  padding: 12px;
  border-radius: 99px;
  border-width: 0.5px 0.5px 0.5px 0.5px;
  border-color: #d8d8d8;
  box-sizing:border-box;
  border-style:solid;
}
.bubble--left {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
  padding: 12px;
  border-radius: 0 99px 99px 0;
  border-width: 0.5px 0.5px 0.5px 0;
  border-color: #d8d8d8;
  box-sizing:border-box;
    border-style:solid;
}

.bubble--right {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
  padding: 12px;
  border-radius: 99px 0 0 99px;
  border-width: 0.5px 0 0.5px 0.5px;
  border-color: #d8d8d8;
  box-sizing:border-box;
    border-style:solid;
}

.bubble-img {
  width: 20px;
  height: auto;
  object-fit: coutain;
  flex-shrink: 0;
}

.bubble-text {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
}

.md-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  overflow: hidden;
}

.md-header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  background: #f7f8fa;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  position: absolute;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-arrow {
  display: block;
  width: 10px;
  height: 10px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
  transform: rotate(45deg);
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.md-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.loading-text {
  font-size: 14px;
  color: #969799;
}

.md-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f7f8fa;
}

/* 右侧目录悬浮按钮 */
.toc-btn {
  background-color: #fff;
  width: 76px;
  height: 46px;
  border-radius: 99px 0 0 99px;
  border: none;
  top: 45%;
  background-color: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-left: 12px;

  z-index: 100;
}

.toc-img {
  width: 40px;
  height: 40px;
}

/* 目录面板 */
.toc-panel {
  position: fixed;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  width: 200px;
  max-height: 60vh;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.toc-header {
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  border-bottom: 1px solid #eee;
}

.toc-list {
  padding: 8px 0;
  max-height: calc(60vh - 44px);
  overflow-y: auto;
}

.toc-item {
  padding: 10px 16px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.toc-item:hover {
  background: #f5f6f8;
  color: #ff7538;
}

:deep(.survey-card-container) {
  width: 100%;
  background: #fff;
  padding: 0;
}

:deep(.survey-card-group) {
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.survey-cell) {
  align-items: flex-start;
  padding: 12px 16px;
  line-height: 24px;
}

.cell-index {
  width: 20px;
  height: 20px;
  background: linear-gradient(143deg, #ff7538 17%, #ff5c50 98%);
  color: #f7f8fa;
  border-radius: 50%;
  font-size: 12px;
  text-align: center;
  line-height: 20px;
  margin-right: 10px;
  margin-top: 2px;
  flex-shrink: 0;
}

.cell-title {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}

.cell-content {
  font-size: 14px;
  color: #ff7538;
  word-break: break-all;
}

:deep(.survey-cell:hover) {
  background: #f7f7f7;
}
:deep(.van-popup) {
  height: 240px;
}
/* ✅ 修改后 - flex 自适应 + iOS 滚动修复 */
:deep(.popup-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.popup-content) {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 关键 */
}

:deep(.van-nav-bar) {
  flex-shrink: 0;
}
.jump-btn {
  flex: none;
  height: calc(100% - 56px - 70px);
}
.fotter {
  height: 60px;
  background: linear-gradient(180deg, #fffbf900 0%, #f7f0eb 93%);
  padding: 8px 12px env(safe-area-inset-bottom);
  display: flex;
  justify-content: center;
  align-items: center;
}
:deep(.van-popup__close-icon) {
  color: #2e323a;
  font-size: 24px;
  top: 12px;
}
</style>
<style>
.my-bubble {
  width: fit-content !important;
  height: fit-content !important;
  background: transparent !important;
  border-radius: 0 !important;
}
:deep(.van-floating-bubble) {
  width: fit-content !important;
  height: fit-content !important;
  background: transparent !important;
  border-radius: 0 !important;
}
</style>
