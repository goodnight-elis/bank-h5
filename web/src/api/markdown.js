import request from "../utils/request";

/**
 * 获取报告
 *
 * 获取报告
 * GET /v1/users/{user_id}/preferences
 * @param {string|number} reportId - 报告 ID
 * @returns {Promise} 获取报告
 */
export function getReportMarkDown(reportId) {
  return request({
    url: `/report/${reportId}`,
    method: "get",
  });
}