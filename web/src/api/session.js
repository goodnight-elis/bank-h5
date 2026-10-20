import request from '../utils/request'

/**
 * 会话管理 API
 *
 * 基础路径：/v1/session
 * 注意：请求路径不带 /v1 前缀（已在 baseURL 中配置）
 */

/**
 * 删除会话
 * DELETE /v1/session/{session_id}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 删除结果
 */
export function deleteSession(sessionId) {
  return request({
    url: `/session/${sessionId}`,
    method: 'delete'
  })
}

/**
 * 修改会话标题
 * PUT /v1/session/{session_id}/title
 * @param {string} sessionId - 会话 ID
 * @param {string} title - 新标题
 * @returns {Promise} 更新结果
 */
export function updateSessionTitle(sessionId, title) {
  return request({
    url: `/session/${sessionId}/title`,
    method: 'put',
    data: { title }
  })
}

/**
 * 批量删除会话
 * POST /v1/session/batch-delete
 * @param {string[]} sessionIds - 会话 ID 数组
 * @returns {Promise} 删除结果
 */
export function batchDeleteSessions(sessionIds) {
  return request({
    url: '/session/batch-delete',
    method: 'post',
    data: { sessionIds: sessionIds }
  })
}
