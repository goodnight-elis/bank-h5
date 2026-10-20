import request from '../utils/request'

/**
 * 用户偏好（Preference / Onboarding）API
 *
 * 基础路径：/v1/users/{user_id}/preferences
 * 注意：请求路径不带 /v1 前缀（已在 baseURL 中配置）
 */

/**
 * 获取用户引导（onboarding）状态
 * GET /v1/users/{user_id}/preferences/onboarding-status
 * @param {string|number} userId - 用户 ID
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} { needsOnboarding: boolean }
 */
export function getOnboardingStatus(userId, sessionId) {
  return request({
    url: `/users/${userId}/preferences/onboarding-status`,
    method: 'get',
    params: { session_id: sessionId }
  })
}

export default {
  getOnboardingStatus
}
