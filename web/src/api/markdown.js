import request from "../utils/request";

/**
 * 获取报告 Markdown 内容
 *
 * GET /v1/report/{reportId}
 * @param {string|number} reportId - 报告 ID
 * @returns {Promise} 获取报告
 */
export function getReportMarkDown(reportId) {
  return request({
    url: `/report/${reportId}`,
    method: "get",
  });
}