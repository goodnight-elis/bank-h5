/**
 * 通用工具函数
 */
import { goToLogin as bridgeGoToLogin, openExternal as bridgeOpenExternal, isIOS as bridgeIsIOS } from './envAdapter'

/**
 * 文件字节转 KB，保留小数
 */
export function byteToKB(bytes, fixed = 2) {
  if (!bytes || bytes <= 0) return "0 kb";
  const size = bytes / 1024;
  return `${size.toFixed(fixed)} kb`;
}

/**
 * 获取文件类型标识
 */
export function getFileType(file) {
  const fileName = file.name.toLowerCase();
  const extMap = {
    pdf: "pdf", txt: "txt", doc: "doc", docx: "docx",
    xls: "xls", xlsx: "xlsx", ppt: "ppt", pptx: "pptx",
  };
  const ext = fileName.split(".").pop();
  return extMap.hasOwnProperty(ext) ? extMap[ext] : null;
}

/**
 * 文件名中间省略
 */
export function middleEllipsis(name, prefixLen = 6, suffixLen = 4) {
  if (!name) return "";
  if (name.length <= prefixLen + suffixLen) return name;
  return `${name.slice(0, prefixLen)}...${name.slice(-suffixLen)}`;
}

/**
 * 打开外部链接（统一走 envAdapter，bridge/web 自适应）
 */
export function jumpChatBIApp(url) {
  bridgeOpenExternal(url);
}

/**
 * 根据按钮数据生成 App 路由跳转链接（供 openWebView 使用）
 * - 传入字符串直接返回
 * - 优先使用显式的 url / path
 * - 否则按 app://<route>?<query> 约定拼接业务参数
 * @param {object|string} data - 按钮点击数据
 * @returns {string} 跳转链接
 */
export function generateAppRouteUrl(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.url) return data.url;
  if (data.path) return data.path;

  const route = data.route || data.appUrl || data.app_url || 'open';
  const reserved = ['route', 'appUrl', 'app_url', 'action', 'qa_index'];
  const query = Object.keys(data)
    .filter((k) => !reserved.includes(k))
    .map((k) => {
      const v = data[k];
      return `${encodeURIComponent(k)}=${encodeURIComponent(v == null ? '' : v)}`;
    })
    .join('&');
  const base = route.includes('://') || route.startsWith('/') ? route : `app://${route}`;
  return query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base;
}

/**
 * 会话过期跳转登录（统一走 envAdapter）
 */
export function goToLogin() {
  bridgeGoToLogin();
}

/**
 * 报告类型标签（模板项目用通用字典）
 */
export function getTypeLabel(reportType) {
  const map = {
    pre_visitreport: '访前报告',
    f11_comprehensive_solution: '综合方案',
    post_visit_review: '拜访纪要',
  };
  return map[reportType] || '报告';
}

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 判断是否 iOS（统一走 envAdapter）
 */
export function isIOS() {
  return bridgeIsIOS();
}
