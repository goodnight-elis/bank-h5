import { createApp } from "vue";

// ==================== 1. 依赖引入 ====================
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import "./style.css";
import "markstream-vue/index.css";

// 状态
import { useChatStore } from "./stores/chat";
import { useUserInfo } from "@/stores/user";

// 工具
import { hasBridge, readBridgeLoginInfo, syncLoginInfo } from "./utils/envAdapter"

// UI 组件库
import Vant from "vant";
import "vant/lib/index.css";

// ==================== 2. 创建 app 实例 ====================
const app = createApp(App);
const pinia = createPinia();

// ==================== 3. 注册插件 ====================
app.use(pinia);
app.use(router);
app.use(Vant);

// 暴露 router 供 envAdapter 使用（解决循环依赖）
window.__appRouter = router;

// ==================== 4. 初始化全局状态 ====================
const chatStore = useChatStore();
const userStore = useUserInfo();
chatStore._initGlobalListeners();

// ==================== 5. 环境适配初始化 ====================
const HEARTBEAT_INTERVAL = 30 * 60 * 1000;

// 5.1 登录信息同步（bridge / web 统一入口）
function syncLoginFromBridge() {
  const info = readBridgeLoginInfo()
  if (!info) return false
  syncLoginInfo(info)
  chatStore.syncFromBridge(info.userId, info.userName, info.sessionId, info.empNo)
  userStore.setUserInfo(info)
  localStorage.setItem("setLoginInfoTime", Date.now().toString())
  console.log("[env] bridge 登录信息同步完成", info.userId)
  return true
}

// 挂载给 native 回调使用（bridge 场景下 APP 主动调用）
if (!window.setLoginInfo) {
  window.setLoginInfo = syncLoginFromBridge
}

// 尝试从 bridge 同步，失败则走 Web 模式（不阻塞启动）
if (hasBridge()) {
  // 延迟导入 pluginHelper（仅在 bridge 场景下需要）
  import("./utils/jsbridge/pluginHelper.client.js").then(() => {
    syncLoginFromBridge()
  }).catch(() => {
    console.warn("[env] pluginHelper 加载失败，走 Web 模式")
  })
} else {
  console.log("[env] 无 JSBridge，纯 Web 模式运行")
  // Web 模式下 userId 从 localStorage 读取（Login 页面写入）
  const webUserId = localStorage.getItem("agent_userId")
  if (webUserId) {
    chatStore.syncFromBridge(webUserId, localStorage.getItem("agent_userName") || "", "", "")
  }
}

// 5.2 原生回调桩（bridge 场景由 native 调用，Web 场景无害保留）
window.$Fw = { call(callback) { callback && callback() } };
window.$appRef = {};

window._Page = {
  onHide(flag) {
    console.log(flag, "onHide");
  },
  onShow(flag) {
    console.log(flag, "onShow");
    if (flag === "backgroundToForeground") {
      const last = Number(localStorage.getItem("setLoginInfoTime") || "0");
      if (Date.now() - last >= HEARTBEAT_INTERVAL) {
        syncLoginFromBridge();
      }
    }
  },
  shakeItOff() {},
  swipeBack() {},
};

// ==================== 6. 挂载 ====================
app.mount("#app");
