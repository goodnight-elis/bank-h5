<template>
  <div
    :class="['markdown-body', fullPage ? 'full-page' : 'chat-page']"
    v-html="rendered"
    v-if="!reportNoContent"
  ></div>
  <div v-else>
    <van-empty description="未获取到报告相关信息" image-size="200" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import { xssDefender } from "@/utils/xssHelper";

import './markdown-fullpage.less';
/**
 * Markdown 渲染组件
 *
 * 使用场景：
 * 1. 对话中内联显示（fullPage=false，默认）
 * 2. 独立页面全屏显示（fullPage=true）
 *
 * @param {string} content - Markdown 内容
 * @param {boolean} fullPage - 是否全屏模式（影响样式）
 */
const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  fullPage: {
    type: Boolean,
    default: false,
  },
  reportNoContent: {
    type: Boolean,
    default: false,
  },
});

const md = new MarkdownIt({
  html: true, // 启用 HTML 标签（applyCustomStyles 生成的 <span> 需要渲染）
  breaks: true, // 换行符转 <br>
  linkify: true, // 自动识别 URL 转链接
  typographer: true, // 智能引号等
});

/**
 * 自定义样式映射表
 * 后端在 Markdown 中使用自定义标记语法表达特殊样式，前端在此替换为 HTML
 *
 * 支持的语法：
 * - {color:#xxx}文本{/color}          → 文字颜色
 * - {color:#xxx,bold}文本{/color}     → 文字颜色 + 加粗
 * - {size:16}文本{/size}              → 字体大小
 * - {highlight}文本{/highlight}       → 高亮背景
 */
const STYLE_RULES = [
  // {color:#xxx}text{/color} 或 {color:#xxx,bold}text{/color}
  {
    pattern: /\{color:([^}]+)\}([\s\S]*?)\{\/color\}/g,
    replace: (_, val, text) => {
      const [color, ...mods] = val.split(",");
      const styles = [`color:${color}`];
      if (mods.includes("bold")) styles.push("font-weight:bold");
      return `<span style="${styles.join(";")}">${text}</span>`;
    },
  },
  // {size:16}text{/size}
  {
    pattern: /\{size:(\d+)\}([\s\S]*?)\{\/size\}/g,
    replace: (_, val, text) => {
      return `<span style="font-size:${val}px">${text}</span>`;
    },
  },
  // {highlight}text{/highlight}
  {
    pattern: /\{highlight\}([\s\S]*?)\{\/highlight\}/g,
    replace: (_, text) => {
      return `<span class="text-highlight">${text}</span>`;
    },
  },
];

/**
 * 将自定义标记语法替换为 HTML span 标签
 */
function applyCustomStyles(content) {
  if (!content) return content;
  let result = content;
  for (const rule of STYLE_RULES) {
    result = result.replace(rule.pattern, rule.replace);
  }
  return result;
}
// 处理table 异常问题(暂不适用)
function normalizeForRender(content) {
  if (!content) return content;
  let result = content;
  // 1.字面量 \n / \t 真实换行/制表符
  result = result.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  // 2 去除div包裹的标签 保留内部内容
  result = result.replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "\n");

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isSeparator = (line) =>
    /^\s*\|?[\s:：|-]+\|?\s*$/.test(line) && line.includes("-");
  const lines = result.split("\n");
  // 分隔行容错, 全角冒号规范为半角, 前一行不是表格行, 移除不展示
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!isSeparator(lines[i])) continue;
    lines[i] = lines[i].replace(/：/g, ":");
    if (!isTableRow(lines[i - 1]) || "") {
      lines.splice(i, 1);
    }
  }
  //流式表格容错,存在表头行 + 数据行, 但分隔行缺失/未到达时自动补全
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      isTableRow(lines[i]) &&
      isTableRow(lines[i + 1]) &&
      !isSeparator(lines[i + 1])
    ) {
      const colCount = lines[i].split("|").length - 2;
      const separator = "|" + " --- |".repeat(Math.max(colCount, 1)).trim();
      lines.splice(i + 1, 0, separator);
      i++; // 跳过已插入的分隔行
    }
  }
  // 空数据行过滤
  const isEmptyCell = (cell) => /^[\s\-—-—]*$/.test(cell);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!isTableRow(lines[i]) || isSeparator(lines[i])) continue;
    if (!isTableRow(lines[i - 1]) || "") continue;
    const cells = lines[i].split("|").slice(1, -1);
    if (cells.length && cells.every(isEmptyCell)) {
      lines.splice(i, 1);
    }
  }
  return lines.join("\n");
}

const rendered = computed(() => {
  if (!props.content) return "";
  // 先做流式容错预处理,再应用自定义样式标记, 最后渲染markdown
  // const source = applyCustomStyles(props.content);
  // const source = applyCustomStyles(normalizeForRender(props.content));
  let html = md.render(props.content);
  // 去除包含 <details> 或 <summary> 的 p 标签（兼容 HTML 编码和原始格式）
  html = html.replace(
    /<p[^>]*>\s*<e?details[^>]*>[\s\S]*?<\/e?details>\s*<\/p>/g,
    ""
  );
  html = html.replace(
    /<p[^>]*>\s*<e?summary[^>]*>[\s\S]*?<\/e?summary>\s*<\/p>/g,
    ""
  );
  html = html.replace(
    /<p[^>]*>\s*&lt;details&gt;[\s\S]*?&lt;\/details&gt;\s*<\/p>/g,
    ""
  );
  html = html.replace(
    /<p[^>]*>\s*&lt;summary&gt;[\s\S]*?&lt;\/summary&gt;\s*<\/p>/g,
    ""
  );
  // console.log(html, "markdown-html");

  // 使用 xssDefender 净化 HTML，防止 XSS 攻击并移除 a 标签的点击跳转
  html = xssDefender(html);

  return html;
});
</script>

