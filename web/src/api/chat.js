import request from "../utils/request";

/**
 * 对话相关 API
 *
 * 接口文档：对公掌银智能体 API 接口文档 v1.0
 * 基础路径：/v1
 * 代理配置：vite.config.js → http://60.204.130.107:8000
 *
 * 注意：axios 请求路径不带 /v1 前缀（已在 baseURL 中配置）
 *       SSE fetch 路径需保留完整 /v1 前缀（不经过 axios）
 */

/**
 * 发送消息（SSE 流式）
 *
 * 注意：此方法不通过 axios request，而是直接使用 fetch（在 sse.js 中）
 * 因此 URL 需要保留完整的 /v1 前缀，供 vite proxy 匹配
 *
 * POST /v1/chat/stream
 * @property {string} url - SSE 请求地址（完整路径）
 * @property {function} formatBody - 构造请求体
 */
export const sendMessage = {
  url: "/v1/chat/stream",
  /**
   * 构造流式对话请求体
   * @param {string} sessionId - 会话 ID
   * @param {string} message - 用户消息内容
   * @param {string[]} fileIds - 附件文件 ID 列表
   * @param {string} userId - 用户 ID
   * @param {string} userName - 用户名
   * @returns {object} 请求体对象
   */
  formatBody(
    sessionId,
    message,
    fileIds = [],
    userId = "",
    username = "",
    ) {
    const body = {
      session_id: sessionId,
      message,
      userId: userId,
      username: username,
      };
    
    if (fileIds.length > 0) {
      body.file_ids = fileIds;
    }
    return body;
  },
};

/**
 * 独立文件上传
 * POST /v1/file/upload
 * @param {File} file - 待上传的文件
 * @returns {Promise} { fileId, url, name }
 */
export function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: "/file/upload",
    method: "post",
    data: formData,
    isUpload: true,
  });
}

/**
 * 普通对话（JSON 非流式）
 * POST /v1/chat
 * @param {object} data - { session_id, message, user_id?, username? }
 * @returns {Promise} AI 回复内容
 */
export function chat(data) {
  return request({
    url: "/chat",
    method: "post",
    data,
  });
}

/**
 * 文件上传对话（Multipart）
 * POST /v1/chat/upload
 * @param {object} data - { session_id, question, user_id?, username?, files? }
 * @returns {Promise} AI 回复内容
 */
export function chatUpload(data) {
  const formData = new FormData();
  formData.append("session_id", data.session_id);
  formData.append("question", data.question);
  if (data.user_id) formData.append("user_id", data.user_id);
  if (data.username) formData.append("username", data.username);
  if (data.files) {
    data.files.forEach((file) => formData.append("files", file));
  }
  return request({
    url: "/chat/upload",
    method: "post",
    data: formData,
    isUpload: true,
  });
}

/**
 * 获取会话历史列表
 * GET /v1/chat/history/session/list/{user_id}
 * @param {string} userId - 用户 ID
 * @param {number} [limit=50] - 返回数量限制
 * @returns {Promise} { user_id, sessions, count }
 */
export function getSessions(userId, limit = 1000) {
  return request({
    url: `/chat/history/session/list/${userId}`,
    method: "get",
    params: { limit },
  });
}

/**
 * 获取指定会话的消息历史
 * GET /v1/chat/history/{session_id}
 * @param {string} sessionId - 会话 ID
 * @param {number} [limit=50] - 返回数量限制
 * @returns {Promise} { session_id, messages, count }
 */
export function getMessages(sessionId, limit = 1000) {
  return request({
    url: `/chat/history/${sessionId}`,
    method: "get",
    params: { limit },
  });
}

/**
 * 获取会话附件列表
 * GET /v1/chat/attachments/{session_id}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 附件列表
 */
export function getAttachments(sessionId) {
  return request({
    url: `/chat/attachments/${sessionId}`,
    method: "get",
  });
}

/**
 * 获取 Interrupt 状态
 * GET /v1/chat/interrupt/{session_id}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} interrupt 状态
 */
export function getInterrupt(sessionId) {
  return request({
    url: `/chat/interrupt/${sessionId}`,
    method: "get",
  });
}

/**
 * 恢复被 interrupt 暂停的对话（续推，SSE 流式）
 *
 * 注意：此方法不通过 axios request，而是直接使用 fetch（在 sse.js 中）
 * 因此 URL 需要保留完整的 /v1 前缀，供 vite proxy 匹配
 *
 * POST /v1/chat/stream/resume/{session_id}
 * @property {string} url - SSE 请求基础路径（sessionId 需拼接）
 * @property {function} formatBody - 构造请求体
 */
export const resumeMessage = {
  url: "/v1/chat/stream/resume",
  formatBody(sessionId, data) {
    const { qa_index, is_skip, is_close, answer, userId, action } = data;
    return {
      qa_index,
      is_skip,
      is_close,
      ...(action && { action }),
      ...(answer && { answer }),
      ...(userId && { userId }),
    };
  },
};

/**
 * 创建新会话
 * POST /v1/session/create
 * @param {object} data - { user_id, tenant_id?, workspace_id?, title? }
 * @returns {Promise} { session_id, user_id, title, status, created_at }
 */
export function createSession(data={}) {
  return request({
    url: "/session/create",
    method: "post",
    data,
  });
}

/**
 * 获取会话详细信息
 * GET /v1/session/{session_id}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 会话信息
 */
export function getSession(sessionId) {
  return request({
    url: `/session/${sessionId}`,
    method: "get",
  });
}

/**
 * 获取上一期会话
 * GET /v1/session/get_previous_session/{user_id}
 * @param {string} userId - 用户 ID
 * @param {number} currentSessionId - 当前会话 ID
 * @returns {Promise} 上一期会话信息
 */
export function getPreviousSession(userId, currentSessionId) {
  return request({
    url: `/session/get_previous_session/${userId}`,
    method: "get",
    params: {
      current_session_id: currentSessionId,
    },
  });
}

/**
 * 提交备用选项选择（多步收集后统一提交）
 * POST /v1/chat/option
 * @param {object} data - { session_id, selections: [{ step, selected }] }
 * @returns {Promise} 提交结果
 */
export function submitOption(data) {
  return request({
    url: "/chat/option",
    method: "post",
    data,
  });
}

/**
 * 兜底拉取最新报告
 * GET /v1/chat/session/{session_id}/latest-report
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 报告数据（同 event:card 的 data），无报告时返回 { exists: false }
 */
export function getLatestReport(sessionId) {
  return request({
    url: `/chat/session/${sessionId}/latest-report`,
    method: "get",
  });
}

/**
 * 获取功能胶囊列表（固定内容，非 SSE）
 * GET /v1/chat/session/{session_id}/chips
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 胶囊列表
 */
export function getChips(sessionId) {
  return request({
    url: `/tips`,
    method: "get",
  });
}

/**
 * 获消息反馈(点赞和踩)
 * /v1/messages/{message_id}/feedback
 * POST /v1/messages/{message_id}/feedback
 * @param {string} messageId - 消息 ID
 * @param {string} fbk_liked - 用户反馈：0=不喜欢, 1=喜欢, NULL=未反馈
 * @param {string} fbk_comment - fbkLiked为0时必填，用户反馈：评论/意见
 * @returns {Promise}   消息反馈结果
 */
export function submitFeedback(data) {
  const { messageId, user_id, ...params } = data;
  return request({
    url: `/messages/${messageId}/feedback?user_id=${user_id}`,
    method: "post",
    data: params,
  });
}

/**
 * 查询异步任务结果
 * GET /v1/task/{task_id}/result
 * @param {string} taskId - 任务 ID
 * @returns {Promise} { status: 'pending' | 'completed', session_id?, report_data? }
 */
export function getTaskStatus(taskId) {
  return request({
    url: `/tasks/${taskId}/status`,
    method: "get",
  });
}

/**
 * 获取待办数量
 * GET /v1/task/{task_id}/result
 * @param {string} taskId - 任务 ID
 * @returns {Promise} { status: 'pending' | 'completed', session_id?, report_data? }
 */
export function getToDoCount(data) {
  return request({
    url: `/external/todo-count`,
    method: "post",
    data,
  });
}

/**
 * 获取D
 * GET /v1/task/{task_id}/result
 * @param {string} taskId - 任务 ID
 * @returns {Promise} { status: 'pending' | 'completed', session_id?, report_data? }
 */
export function getToDounreadCount(data) {
  return request({
    url: `/external/acc_msg`,
    method: "post",
    data,
  });
}

/**
 * 获取初始化提示词语
 * GET /v1/session/{session_id}
 * @param {string} sessionId - 会话 ID
 * @returns {Promise} 会话信息
 */
export function getGuidance(session_id) {
  return request({
    url: `/chat_gdn/guidance/${session_id}`,
    method: "get",
  });
}

