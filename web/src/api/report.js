import request from '../utils/request'

/**
 * 报告相关 API
 *
 * 接口文档：对公掌银智能体 API 接口文档 v1.0
 * 基础路径：/v1
 * 代理配置：vite.config.js → http://60.204.130.107:8000
 *
 * 注意：axios 请求路径不带 /v1 前缀（已在 baseURL 中配置）
 */

/**
 * 获取用户的所有报告列表
 * GET /v1/report/list/{user_id}
 * @param {string} userId - 用户 ID
 * @returns {Promise} 报告列表
 */
export function getReportList(userId) {
  return request({
    url: `/report/list/${userId}`,
    method: 'get'
  })
}

/**
 * 批量删除历史报告
 * POST /v1/report/batch-delete
 * @param {string[]} reportIds - 报告 ID 数组
 * @returns {Promise} 删除结果
 */
export function batchDeleteReports(reportIds) {
  return request({
    url: '/report/batch-delete',
    method: 'post',
    data: { reportIds }
  })
}
