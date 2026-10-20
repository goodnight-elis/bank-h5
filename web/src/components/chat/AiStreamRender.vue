<template>
  <div class="aistream-render">
    <MarkdownRender
      class="markdown-body chat-page"
      mode="chat"
      :content="displayedContent"
      :final="renderFianl"
      :max-live-nodes="0"
      :batch-rendering="true"
      :render-batch-size="16"
      :render-batch-delay="8"
      :render-batch-budget-ms="4"
      :fade="false"
    />
    <!-- @click="handleLinkClick" -->
    <!-- 自定义打字机光标 -->
    <!-- <span v-if='!renderFianl && typing' class="typing-cursor"></span> -->
  </div>
</template>
<script setup>
/**
 * AI 流式Markdown 渲染组件打字机效果
 * 基于markstream-vue 在组件内部柱子递增展示内容
 * 实现打字机动画, 支持两种场景
 * 1. 内容一次性到达. 从头逐字动画展示
 * 2. 内容流式增长, 跟随信内容持续动画, 直到结束
 * mode="chat"                          渲染模式：chat 模式，针对聊天场景优化（如短段落、代码块等）
 * content="displayedContent"            要渲染的 Markdown 文本内容
 * final="renderFinal"                   是否为最终内容：true 时一次性完整渲染；false（流式中）走增量渲染策略 
 * max-live-nodes="0"                    流式渲染时同时保持"活跃"（可继续追加）的 DOM 节点上限，0 = 不限制，全部节点均可追加 
 * batch-rendering="true"                启用批量渲染：将多次 DOM 操作合并，减少重排/重绘次数，降低流式输出时的卡顿 
 * render-batch-size="16"                每批最多渲染 16 个节点，控制单次 DOM 提交量，避免一帧内更新过多节点 
 * render-batch-delay="8"                批次间隔 8ms（约 1 帧的 1/4），让浏览器有机会完成 paint(把算好的布局真正画成屏幕上的像素)，保持滚动流畅 
 * render-batch-budget-ms="4"            单批渲染时间预算 4ms，超时则提前收尾，为同帧内其他任务（事件处理、动画）留余量 
 * fade="false"                          禁用新内容的淡入动画，聊天场景下减少视觉噪音、避免频繁闪烁  
 * @params {string} content  -marfdown 内容(流式和完整都可以)
 * @params {boolean} isFinal  -流是否已结束
 * @params {boolean} typing  -是否使用打字机效果
 */
import { MarkdownRender } from "markstream-vue";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import '../common/markdown-chat.less';
// import { xssDefender } from "@/utils/xssHelper";

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  isFinal: {
    type: Boolean,
    default: true,
  },
  /**  是否使用打字机效果, false不使用打字机效果, 用于历史对话 */
  typing: {
    type: Boolean,
    default: true,
  },
});
/**  当前已展示的内容 */
const displayedContent = ref("");
/** xss净化后的完整内容（每次 content 变化只净化一次） */
// const safeContent = ref(""); //TODO
/**  当前已展示的字符数 */
let currentLength = 0;
/**  定时器ID */
let timer = null;

/**
 * 启动/保持打字机定时器
 * 每次tick 动态计算步长; 落后越多打字越快, 确保不是长时间落后
 */
function ensureTyping() {
  if (timer) return; // 已在运行
  tick();
}
/**
 * 判断一行是否为表格行(以 | 开头且包含至少2个 | )
 */
function isTableLine(line) {
  const t = line.trim();
  return t.startsWith("|") && (t.match(/\|/g) || []).length >= 2;
}
/**
 * 判断一行是否为表格分隔行(如| --- | :---:|)
 */
function isTableSeparatorLine(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*\|?\s*$/.test(line);
}
/**
 *   计算第index行在原文中的字符偏移(split 后按 \n 累加)
 */
function getOffsetLine(lines, index) {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += lines[i].length + 1;
  }
  return offset;
}

/**
 * 检测文本末尾是否处于[未完成的表格块], 返回安全截断位置
 *
 * 规则: 从末尾向前收集连续的表格行块(允许跨过1个空行)
 * 块内已有分隔行(|---|) 且末行是完整表格行 -> 表格正常增长, 返回 -1;
 * 否则(表头后分隔行未写完,行被截断) -> 返回表格块起始偏移
 * 打字机在该位置前暂停展示,待表格接口完整后再逐字展示
 * 避免截断的| / --- 特殊字符被解析成普通文本导致表格渲染失败
 *
 * @params {string} text - 打字机已推进的内容片段 (按 currentLength 截断)
 * @returns {number} -1 表示可安全展示全部; >=0 表示应截断到该偏移 (不含表格块)
 */

function getSafeTruncate(text) {
  if (!text) return -1;

  //定位最后一个非空行(跳过末尾空行)
  const lines = text.split("\n");
  let endIdx = lines.length - 1;
  while (endIdx >= 0 && !lines[endIdx].trim()) endIdx--;
  if (endIdx < 0) return -1;
  // 从最后一个非空行向前收集连续的表格行块起点 (允许跳过1个空行)
  let startIdx = endIdx;
  while (startIdx > 0) {
    const prev = lines[startIdx - 1];
    if (isTableLine(prev)) {
      startIdx--;
    } else if (
      !prev.trim() &&
      startIdx >= 2 &&
      isTableLine(lines[startIdx - 2])
    ) {
      // 空行+ 表格行: 继续向前(跨空行的表格块)
      startIdx -= 2;
    } else {
      break;
    }
  }
  const block = lines.slice(startIdx, endIdx + 1);
  const hasSeparator = block.some((t) => isTableSeparatorLine(t));
  const lastLine = block[block.length - 1];

  // 已有分隔行且末行是完整表格行 -> 表格在正常增长, 可展示; 否则隐藏整个表格块, 待完成后再展示
  return hasSeparator && isTableLine(lastLine)
    ? -1
    : getOffsetLine(lines, startIdx);
}

/**
 * 获取安全展示内容: 流式过程中若正处于未完成的表格块
 * 则隐藏该表格块(从表格起始处截断), 待表格完整后再逐字展示;
 * 流结束后(isFinal) 或打字机已追平内容时完整展示
 */
function getSafeContent() {
  const full = props.content || "";
  // const full = safeContent.value || ""; //TODO
  const typed = full.substring(0, currentLength);
  if (props.isFinal || currentLength >= full.length) return typed;
  const cut = getSafeTruncate(typed);
  return cut >= 0 ? typed.substring(0, cut) : typed;
}

/**
 * 打印机
 */

function tick() {
  const target = props.content || "";
  // const target = safeContent.value  || "";         // TODO
  if (currentLength >= target.length) {
    // 已追上, 停止定时器 (同步一次安全内容,确保表格/流末状态正确)
    // displayedContent.value = getSafeContent(); // TODO
    timer = null;
    return;
  }
  const remaining = target.length - currentLength;
  // 动态步长: 剩余越多越快, 保证约15个tick 内追上
  const chunkSize = Math.max(1, Math.ceil(remaining / window.smartstaring.CATCHUP_DIVISOR));
  currentLength = Math.min(currentLength + chunkSize, target.length);
  displayedContent.value = target.substring(0, currentLength);
  // displayedContent.value = getSafeContent(); // TODO
  if (currentLength < target.length) {
    timer = setTimeout(tick, window.smartstaring.TICK_INTERVAL);
  } else {
    timer = null;
  }
}

/**
 * 监听content 变化
 * 内容增长 -> 继续打字
 * 内容被重置(变短) -> 从头开始
 * 内容为空, 清空
 * typing = false 时直接展示完整内容, 跳过动画
 */
watch(
  () => props.content,
  (newContent) => {
    if (!newContent) {
      //清空内容
      currentLength = 0;
      displayedContent.value = "";
      //TODO
      // safeContent.value = "";
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return;
    }
    // console.log(new Date().getTime(),"props.content-------->>>>>>",props.content)

    // ========== 核心：只在这里做一次 XSS 净化 TODO==========
    // safeContent.value = xssDefender(newContent);

    // 历史对话查看模式 不执行打字机效果
    if (!props.typing) {
      currentLength = newContent.length;
      displayedContent.value = newContent;
      //TODO
      // currentLength = safeContent.value.length;
      // displayedContent.value = safeContent.value;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return;
    }
    // 内容被重置(新内容比已展示的短) 从头开始
    if (newContent.length < currentLength) {
      currentLength = 0;
      displayedContent.value = "";
    }

    // 启动 / 保持打字机
    ensureTyping();
  },
  { immediate: true }
);

/**
 * 渲染是否已结束(打字完成 且 流已结束)
 */
const renderFianl = computed(() => {
  return (
    props.isFinal &&
    displayedContent.value.length >= (props.content?.length || 0)
  );
  // return (
  //   props.isFinal &&
  //   displayedContent.value.length >= (safeContent.value.length || 0) // TODO
  // );
});
// 传值父组件, 用作展示按钮的判断条件
const emit = defineEmits(['render-final']);
watch(renderFianl, (val) => {
  emit('render-final', val);
});


/**
 * 组件卸载时清理定时器
 */
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
});
/**
 * 处理链接点击
 * H5 环境中用 window.open 打开链接
 */
// function handleLinkClick(e) {
//   const target = e.target.closest("a");
//   if (target && target.href) {
//     e.preventDefault();
//     window.open(target.href, "_blank");
//   }
// }
</script>
<style lang='less' scoped>
/* 样式已迁移至 markdown-chat.less，此处仅保留组件独有样式 */
</style>
