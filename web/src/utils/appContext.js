/**
 * APP 上下文管理
 *
 * 统一管理 H5 内嵌 APP 场景下的三个核心身份变量：
 * - token：用户登录凭证，APP 通过 refreshToken 事件下发
 * - userId：用户 ID，APP 打开 H5 时传入
 * - APPsessionId：APP 侧会话/页面实例 ID，用于后端关联 APP 生命周期
 *
 * 持久化策略：使用 sessionStorage
 * - H5 内嵌 APP 场景下，WebView 可能被销毁重建（如返回 APP 再点击通知进入）
 * - sessionStorage 在同源 WebView 间共享，即使 WebView 重建数据仍在
 * - sessionStorage 在 WebView 销毁时会丢失，不适合此场景
 *
 * APP 通过 window.dispatchEvent 下发事件更新这些值：
 * - refreshToken  → { detail: { token: 'xxx' } }
 * - refreshUserId → { detail: { userId: 'xxx' } }
 * - refreshAppSessionId → { detail: { APPsessionId: 'xxx' } }
 */

const KEYS = {
  token: 'app_token',
  userId: 'app_userId',
  userName: 'app_userName',
  APPsessionId: 'app_sessionId',
  empNo: "empNo"
}

// ============ Token ============

export function getToken() {
  return sessionStorage.getItem(KEYS.token)
}

export function setToken(token) {
  sessionStorage.setItem(KEYS.token, token)
}

export function clearToken() {
  sessionStorage.removeItem(KEYS.token)
}

// ============ userName ============

export function getUserName() {
  return sessionStorage.getItem(KEYS.userName)
}

export function setUserName(userName) {
  sessionStorage.setItem(KEYS.userName, userName)
}

// ============ userId ============

export function getUserId() {
  return sessionStorage.getItem(KEYS.userId)
}

export function setUserId(userId) {
  sessionStorage.setItem(KEYS.userId, userId)
}

// ============ APPsessionId ============

export function getAppSessionId() {
  return sessionStorage.getItem(KEYS.APPsessionId)
}

export function setAppSessionId(id) {
  sessionStorage.setItem(KEYS.APPsessionId, id)
}

// 工号
export function getEmpNo() {
  return sessionStorage.getItem(KEYS.empNo)
}

export function setEmpNo(empNo) {
  sessionStorage.setItem(KEYS.empNo, empNo)
}
/**
 * 获取所有请求头（axios 和 SSE 共用）
 * @returns {object} 包含 Authorization / X-User-Id / X-App-Session-Id 的请求头对象
 */
export function getAppHeaders() {
  const headers = {}
  const token = getToken()
  const userId = getUserId()
  const appId = getAppSessionId()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (userId) headers['X-User-Id'] = userId
  if (appId) headers['X-App-Session-Id'] = appId

  return headers
}
