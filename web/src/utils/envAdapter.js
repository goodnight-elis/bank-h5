/**
 * 环境适配层 (Environment Adapter)
 *
 * 统一封装 JSBridge / 纯 Web 两种运行环境的差异。
 * 核心原则：feature-detect + graceful fallback
 *
 * 调用方无需关心当前是否有 bridge，一律通过本模块获取能力。
 */

// ==================== Bridge 检测 ====================

/**
 * 当前是否存在可用的原生 JSBridge
 * @returns {boolean}
 */
export function hasBridge() {
  return !!(window.pluginHelper && window.pluginHelper.device)
}

// ==================== 用户身份 ====================

/**
 * 获取用户 ID（bridge 优先，fallback 到 localStorage / URL 参数）
 * @returns {string}
 */
export function getUserId() {
  const fromSession = sessionStorage.getItem('app_userId')
  if (fromSession) return fromSession
  return localStorage.getItem('agent_userId') || ''
}

/**
 * 获取用户名
 * @returns {string}
 */
export function getUserName() {
  const fromSession = sessionStorage.getItem('app_userName')
  if (fromSession) return fromSession
  return localStorage.getItem('agent_userName') || ''
}

/**
 * 获取认证 Token
 * @returns {string}
 */
export function getToken() {
  const fromSession = sessionStorage.getItem('app_token')
  if (fromSession) return fromSession
  return localStorage.getItem('agent_token') || ''
}

/**
 * 获取 APP Session ID
 * @returns {string}
 */
export function getAppSessionId() {
  return sessionStorage.getItem('app_sessionId') || ''
}

/**
 * 获取请求头（axios + SSE 共用）
 * @returns {object}
 */
export function getAuthHeaders() {
  const headers = {}
  const token = getToken()
  const userId = getUserId()
  const appId = getAppSessionId()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (userId) headers['X-User-Id'] = userId
  if (appId) headers['X-App-Session-Id'] = appId
  return headers
}

// ==================== 设备能力 ====================

/**
 * 震动反馈
 * @param {number} ms
 */
export function vibrate(ms = 10) {
  if (hasBridge()) {
    try {
      window.pluginHelper.device.vibrate()
    } catch (e) {
      navigator.vibrate?.(ms)
    }
  } else {
    navigator.vibrate?.(ms)
  }
}

/**
 * 打开外部链接
 * @param {string} url
 * @param {object} [options]
 */
export function openExternal(url, options = {}) {
  if (hasBridge()) {
    try {
      window.pluginHelper.device.openWebView({
        height: options.height || '0.85',
        topRadius: options.topRadius ?? 16,
        url,
      })
      return
    } catch (e) {
      console.warn('[envAdapter] bridge openWebView failed, fallback window.open', e)
    }
  }
  window.open(url, '_blank')
}

/**
 * 跳转登录页
 */
export function goToLogin() {
  if (hasBridge() && window.pluginHelper.device.navigateTo) {
    try {
      const systemInfo = window.pluginHelper.device.getSystemInfo()
      let url = 'app://login'
      if (systemInfo.indexOf('android') > -1 || systemInfo.indexOf('HarmonyOS') > -1) {
        url = '/login/LoginActivity'
      }
      window.pluginHelper.device.navigateTo(url)
      return
    } catch (e) {
      console.warn('[envAdapter] bridge goToLogin failed', e)
    }
  }
  const router = window.__appRouter
  if (router) {
    router.push('/login')
  } else {
    sessionStorage.clear()
    window.location.href = '/'
  }
}

/**
 * 判断当前设备是否为 iOS
 * @returns {boolean}
 */
export function isIOS() {
  try {
    if (hasBridge() && window.pluginHelper.device.getSystemInfo) {
      const raw = window.pluginHelper.device.getSystemInfo()
      const result = raw ? JSON.parse(raw).result : {}
      if (result.platform) {
        return result.platform.toLowerCase() === 'ios'
      }
    }
  } catch (e) { /* fallthrough */ }
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// ==================== Bridge Session ====================

/**
 * 从 bridge getSession 读取登录信息
 * @returns {object|null}
 */
export function readBridgeLoginInfo() {
  if (!hasBridge()) return null
  try {
    const tempObj = window.pluginHelper.device.getSession({
      SESS_KEY: 'loginInfo',
      cacheType: '1',
    })
    if (typeof tempObj !== 'string' || tempObj.includes('请在客户端使用改功能')) return null
    const parsed = JSON.parse(tempObj)
    if (!parsed?.result) return null
    const obj = JSON.parse(parsed.result)
    const loginInfo = obj.loginInfoResponse
    if (!loginInfo?.gfUser) return null
    return {
      userId: loginInfo.gfUser.loginId,
      userName: loginInfo.gfUser.userName,
      sessionId: obj.sessionId,
      empNo: loginInfo.gfUser.empNo,
      token: loginInfo.token || '',
    }
  } catch (e) {
    console.warn('[envAdapter] readBridgeLoginInfo error:', e)
    return null
  }
}

/**
 * 同步登录信息到 sessionStorage（统一入口）
 * @param {object} info
 */
export function syncLoginInfo(info) {
  if (info.userId) sessionStorage.setItem('app_userId', info.userId)
  if (info.userName) sessionStorage.setItem('app_userName', info.userName)
  if (info.sessionId) sessionStorage.setItem('app_sessionId', info.sessionId)
  if (info.empNo) sessionStorage.setItem('empNo', info.empNo)
  if (info.token) sessionStorage.setItem('app_token', info.token)
}
