<template>
  <div
    class="message-item"
    :class="[
      `message-${message.role}`,
      { 'is-card-mode': message.card || message.isInterrupt },
    ]"
  >
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="message-bubble user-bubble">
      <!-- 附件列表（图片 + 文件） -->
      <div
        v-if="message.attachments && message.attachments.length"
        class="user-attachments"
      >
        <div v-for="(att, idx) in message.attachments" :key="idx">
          <!-- 图片附件 -->
          <img
            v-if="att.type === 'image' && att.previewUrl"
            :src="att.previewUrl"
            class="user-attachment-thumb"
          />
          <!-- 文件附件（pdf/doc等） -->
          <div v-else-if="att.type === 'file'" class="user-attachment-card">
            <!-- <img v-if="att.newType === 'doc' || att.newType === 'docx'" class="file-icon" src="@/assets/docx.png" alt="file" />
            <img v-else-if="att.newType === 'xlsx' || att.newType === 'xls'" class="file-icon" src="@/assets/xlsx.png" alt="file" />
            <img v-else-if="att.newType === 'txt'" class="file-icon" src="@/assets/txt.png" alt="file" />
            <img v-else-if="att.newType === 'ppt' || att.newType === 'pptx'" class="file-icon" src="@/assets/ppt.png" alt="file" />
            <img v-else-if="att.newType === 'pdf'" class="file-icon" src="@/assets/pdf.png" alt="file" />
            <img v-else class="file-icon" src="@/assets/file.png" alt="file" /> -->
            <div class="file-info">
              <div class="file-name">附件：{{ att.showName || att.name }}</div>
              <!-- <div v-if="att.size" class="file-size">大小：{{ att.size }}</div> -->
            </div>
          </div>
        </div>
      </div>
      <!-- 文本内容 -->
      <div class="message-content">{{ message.content }}</div>
    </div>

    <!-- AI 消息 -->
    <div
      v-else
      class="message-bubble ai-bubble"
      :class="[
        {
          'width-100':
            message.card ||
            (message.isInterrupt && message.chips && message.chips.length),
        },
      ]"
    >
      <!-- 违规/错误消息 -->
      <template v-if="message.isViolation || message.status === 'error'">
        <!-- <div class="violation-text">{{ message.content }}</div> -->
        <AiStreamRender @render-final='onRenderFinal' :content="message.content" :typing="typing" :is-final="message.isViolation || message.status === 'error'" />
      </template>
      <!-- interrupt 追问消息 -->
      <template v-else-if="message.isInterrupt">
        <!-- <div class="interrupt-question">{{ message.content }}</div> -->
         <AiStreamRender @render-final='onRenderFinal' :content="message.content" :typing="typing" :is-final="message.isInterrupt" />
        <AgentCustomerCard
          v-if="message.chapters && message.chapters.length"
          :data="message.chapters"
        />
      </template>

      <!-- 卡片消息 -->
      <template v-else-if="message.card">
        <FqReport :reportData="message.card" @viewReport="handleCardClick" />
      </template>

      <!-- 消息内容（支持多段对话 + Markdown / 纯文本） -->
      <div v-else class="message-content">
        <template v-if="message.status === 'streaming' && !hasDisplayContent">
          <span class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </template>
        <!-- 分段模式（格式混合） -->
        <template v-else-if="message.segments && message.segments.length">
          <div
            v-for="(segment, idx) in message.segments"
            :key="idx"
            class="segment-block"
          >
            <!-- Markdown 分段 -->
            <AiStreamRender @render-final='onRenderFinal' :content="segment.content" :typing="typing" :is-final="message.status === 'done'" />
            <!-- <MarkdownRenderer
              v-if="segment.format === 'markdown'"
              :content="segment.content"
            /> -->
            <!-- 纯文本分段 -->
            <!-- <div
              v-else
              class="plain-text"
              v-html="formatPlainText(segment.content)"
            ></div> -->
          </div>
        </template>
        <!-- 单段对话模式：根据 format 区分渲染 -->
        <template v-else-if="message.content">
          <!-- Markdown 格式 -->
          <AiStreamRender @render-final='onRenderFinal' :content="message.content" :typing="typing" :is-final="message.status === 'done'" />
          <!-- <template v-if="message.format === 'markdown'">
            <MarkdownRenderer :content="message.content" />
          </template> -->
          <!-- 纯文本格式 -->
          <!-- <template v-else>
            <div
              class="plain-text"
              v-html="formatPlainText(message.content)"
            ></div>
          </template> -->
        </template>
        <template v-else-if="message.status === 'error'">
          <span class="error-text">消息发送失败</span>
          <button class="retry-btn" @click="$emit('retry', message)">
            重试
          </button>
        </template>
      </div>

      <!-- 反馈弹窗 -->
      <FeedbackModal
        v-model="showFeedbackModal"
        :message-id="message.id"
        :keyboardHeight='keyboardHeight'
        @submit="handleFeedbackSubmit"
      />
    </div>
    <!-- 消息底部按钮 -->
    <div v-if="message.buttons?.length && (showButtons || !typing)" class="message-buttons">
      <template v-for="(btn, idx) in message.buttons">
        <button
          v-if="
            (btn.action.includes('interrupt') && currentInterrupt) ||
            !btn.action.includes('interrupt')
          "
          :key="idx"
          type="button"
          class="msg-btn"
          @click="handleButtonClick(btn)"
        >
          <div>
            {{ btn.text || btn.title }}
          </div>
          <img src="@/assets/router-send.png" alt="" class="button-arrow" />
        </button>
      </template>
    </div>
    <!-- 操作按钮栏（卡片消息不展示，点赞/踩仅在有真实 messageId 时展示） -->
    <div
      v-if="message.role === 'assistant' && !message.card"
      class="action-bar"
    >
      <!-- <div
          class="action-icon"
          :class="{ active: message.actions?.copy }"
          @click="handleAction('copy')"
        >
          <img src="@/assets/ic1.png" alt="复制" />
        </div> -->
      <template v-if="message.id && !message.id.startsWith('assistant-') && (showButtons || !typing)">
        <div class="action-icon" @click="handleAction('like')">
          <img
            v-if="message.actions?.like"
            src="@/assets/ic2-checked.png"
            alt="点赞"
          />
          <img v-else src="@/assets/ic2.png" alt="点赞" />
        </div>
        <div class="action-icon" @click="handleDislike">
          <img
            v-if="message.actions?.dislike"
            src="@/assets/ic3-checked.png"
            alt="踩"
          />
          <img v-else src="@/assets/ic3.png" alt="踩" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * 单条消息渲染组件
 *
 * 支持两种角色：
 * - user：用户消息，右侧橙色气泡
 * - assistant：AI 消息，左侧白色气泡，支持思考过程、段落标题、多种卡片类型
 *
 * 消息状态：done（已完成）| streaming（流式输出中）| error（失败可重试）
 */
import { ref, computed } from "vue";
import MarkdownRenderer from "../common/MarkdownRenderer.vue";
import AiStreamRender from "./AiStreamRender.vue";
import FqReport from "./cards/fqreport.vue";
import FeedbackModal from "../common/FeedbackModal.vue";
import AgentCustomerCard from "./cards/AgentCustomerCard.vue";
import { useChatStore } from "@/stores/chat";
import { xssDefender } from "@/utils/xssHelper";

const chatStore = useChatStore();
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  typing: {
    type:Boolean,
    default: false
  },
  keyboardHeight: {
    type:Number,
    default: 0
  }
});
/**
 * 是否有节展示内容(分段非空 或content非空)
 * 用于流式等待站位判断: 收个内容块到达前展示三点加载动画
 * 避免空分段 (segments = [{content:''}]) 等边界情况导致占位不展示
 */

 const hasDisplayContent = computed(()=>{
    if (props.message.content) return true;
    return (props.message.segments || []).some((t)=> t.content)
 })
const showButtons = ref(false)
function onRenderFinal(final) {
  // final === true 时展示按钮（如"复制"、"点赞"等）, 
  // 因为数据已完成,但打字机还没结束,所以延迟赋值true,展示按钮和点赞,防止因重排按钮跳动
  if (final){
    setTimeout(()=>{
      showButtons.value = true;
    },1000)
  } else {
    showButtons.value = false;
  }
  
}

const emit = defineEmits([
  "retry",
  "action",
  "cardClick",
  "buttonClick",
  "feedback",
]);
/** 当前 interrupt 状态 */
const currentInterrupt = computed(() => {
  const session = chatStore.currentSession;
  return session?.interrupt || null;
});
// 反馈弹窗状态
const showFeedbackModal = ref(false);

// 处理踩按钮点击（打开反馈弹窗）
function handleDislike() {
  if (props.message.actions?.dislike) {
    // 通知父组件
    emit("feedback", {
      messageId: props.message.id,
      sessionId: props.message.sessionId,
      actions: props.message.actions,
    });
    return;
  }
  showFeedbackModal.value = true;
}

// 处理反馈提交
function handleFeedbackSubmit(data) {
  const t = chatStore.sessions[props.message.sessionId].messages.find(
    (item) => item.id === props.message.id
  );
  if (t && !t.actions) {
    t.actions = {};
  }
  // 通知父组件
  emit("feedback", {
    messageId: data.messageId,
    sessionId: props.message.sessionId,
    detail: data.detail,
    actions: props.message.actions,
  });
}

// 处理卡片点击
function handleCardClick(reportData) {
  // 卡片点击：把 reportUrl 提取出来传出去
  emit("cardClick", {
    reportUrl: reportData?.reportUrl,
    reportId: reportData?.reportId,
    card: reportData,
  });
}

// 处理按钮点击
function handleButtonClick(btn) {
  emit("buttonClick", btn);
}

// 纯文本格式化：换行转 <br/>
function formatPlainText(text) {
  if (!text) return "";
  return xssDefender(text, null, true);
}

// 处理操作按钮点击
function handleAction(actionType) {
  // 初始化 actions 对象 解析store状态中的 actions
  const data = chatStore.sessions[props.message.sessionId].messages.find(
    (item) => item.id === props.message.id
  );
  if (data && !data.actions) {
    data.actions = {};
  }
  if (actionType === "copy") {
    // 复制消息内容
    const contentToCopy = extractMessageContent(props.message);
    copyToClipboard(contentToCopy);
  }

  // 触发 action 事件，通知父组件（由父组件负责更新 actions 状态）
  emit("action", {
    messageId: props.message.id,
    actionType,
    sessionId: props.message.sessionId,
    actions: props.message.actions,
  });
}

// 提取消息内容用于复制
function extractMessageContent(message) {
  let content = "";
  if (message.segments && message.segments.length) {
    content = message.segments.map((seg) => seg.content).join("\n");
  } else if (message.content) {
    content = message.content;
  }
  return content;
}

// 复制到剪贴板
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("复制失败:", err);
      // 降级方案
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

// 降级复制方案
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("复制失败:", err);
  }
  document.body.removeChild(textArea);
}
</script>

<style scoped>
.message-item {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column; /* 气泡和操作栏垂直堆叠 */
  width: auto; /* 关键：宽度由内部内容（气泡）撑开，不强制 100% */
  max-width: 100%;
}

.message-user {
  align-items: flex-end;
}

.message-assistant {
  align-items: flex-start;
  /* flex-direction: column; */
  /* flex-wrap: wrap; */
}

.message-item.is-card-mode {
  width: 100%;
}

.message-bubble {
  max-width: calc(100% - 3px);
  padding: 12px;
  border-radius: 12px;
  word-break: break-word;
  color: #1c1f23;
}

.user-bubble {
  background: #ff7538;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

/* 用户消息附件区域 */
.user-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.user-attachment-thumb {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}

.user-attachment-card {
  width: 100%;
  max-width: 300px;
  height: 30px;
  /* background: linear-gradient(101deg, #fffbf9c4 0%, #fff7f4b8 99%);
  border-radius: 10px; */
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  /* border: 0.5px solid #f0f0f0; */
}

.user-attachment-card .file-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  margin-right: 8px;
}

.user-attachment-card .file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.user-attachment-card .file-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  /* overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; */
  /* font-size: 15px; */
}

.user-attachment-card .file-size {
  font-size: 11px;
  color: #999;
}

.ai-bubble {
  width: auto; /* 防止 Flex 默认拉伸占满父级 */
  max-width: 100%;
  background: rgba(255, 255, 255, 0.95);
  color: #1c1f23;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-bubble.width-100 {
  width: 100%;
}
.message-content {
   contain: layout;
  /* 确保高度增长时不被裁剪 */
  overflow: visible;
  min-height: 20px;
  font-size: 15px;
  /* line-height: 1.6; */
  /* 允许手机原生文本选择复制 */
  -webkit-user-select: text;
  user-select: text;
}

/* 多段对话样式 */
.segment-block {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e8e8e8;
}

.message-item:last-child {
  margin-bottom: 0;
}
.segment-block:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* 纯文本分段样式 */
.segment-block .plain-text {
  margin: 0;
}

.typing-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.typing-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: dotBounce 1.4s infinite ease-in-out both;
}
.typing-dots .dot:nth-child(1) {
  animation-delay: 0s;
}
.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes dotBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.error-text {
  color: #ff4d4f;
}

/* 操作按钮栏 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  width: auto; /* 改为自动，跟随气泡宽度或图标宽度 */
  min-width: 80px; /* 防止气泡太短时，图标挤在一起 */
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s ease, transform 0.2s ease;
  flex-shrink: 1;
  -webkit-tap-highlight-color: transparent;
}

.action-icon img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

/* 违规/错误消息 */
.violation-text {
  font-size: 15px;
  /* color: #ff4d4f; */
  color: #1c1f23;
  line-height: 1.6;
}

/* interrupt 追问消息 */
.interrupt-question {
  font-size: 15px;
  color: #1c1f23;
  line-height: 1.6;
}

/* 消息底部按钮 */
.message-buttons {
  display: flex;
  align-items: center;
  width:100%;
  overflow-x: auto;
  gap: 8px;
  padding: 12px 0 0;
  /* border-top: 1px solid #f0f0f0; */
}

.msg-btn {
  padding: 8px 12px;
  background: #fff;
  border: 0.5px solid #d9d9d9;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1c1f23;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  white-space: nowrap;

  /* box-shadow: 0 2px 6px rgba(255, 117, 56, 0.3); */
}
.msg-btn > div {
  line-height: 20px;  /* 处理打字机时上下跳动 */
  display: flex;
  align-items: center;
}
.button-arrow {
  margin-left: 4px;
  width: 20px;
  position: relative;
  top:1px;
}

/* 纯文本格式 */
.plain-text {
  font-size: 15px;
  line-height: 1.6;
  color: #1c1f23;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
