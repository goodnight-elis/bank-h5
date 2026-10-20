/**
 * 工具调用卡片注册表
 *
 * SSE event: card 的 data.toolName 对应此处的 key。
 * 新增工具类型只需在此注册，无需修改 AiStreamRender。
 */
export const cardRegistry = {
  report: () => import('./ReportCard.vue'),
  table: () => import('./TableCard.vue'),
}

/**
 * 根据 toolName 获取异步组件
 * @param {string} toolName
 * @returns {Function|null} 异步 import 函数
 */
export function getCardComponent(toolName) {
  return cardRegistry[toolName] || null
}
