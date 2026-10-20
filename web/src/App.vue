<template>
  <template v-if="showPage">
    <router-view v-slot="{ Component }">
      <keep-alive class="box" :include="keepAlive">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </template>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { useChatStore } from "./stores/chat";
import { useUserInfo } from "./stores/user";
import { useAppStore } from "./stores/app";
import { isIOS, readBridgeLoginInfo, syncLoginInfo } from "@/utils/envAdapter";

const keepAlive = ref([]);
const showPage = computed(() => true);
const chatStore = useChatStore();
const userStore = useUserInfo();
const appStore = useAppStore();

onMounted(() => {
  try {
    const flag = isIOS();
    appStore.setJsBridgeIsIOS(flag);

    // 通过 envAdapter 读取 bridge 登录信息（无 bridge 时返回 null，不阻塞）
    const info = readBridgeLoginInfo();
    if (!info) return; // Web 模式：main.js 已处理 localStorage 恢复
    syncLoginInfo(info);
    chatStore.syncFromBridge(info.userId, info.userName, info.sessionId, info.empNo);
    userStore.setUserInfo(info);
    localStorage.setItem("setLoginInfoTime", Date.now().toString());
    console.log("[App] bridge 初始化完成");
  } catch (error) {
    console.error("[App] 初始化失败:", error);
  }
});
</script>

<style scoped>
.box {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
</style>
