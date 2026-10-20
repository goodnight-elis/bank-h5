<template>
  <div class="login-page">
    <h1 class="login-title">AI Agent</h1>
    <p class="login-subtitle">智能体对话平台</p>
    <form class="login-form" @submit.prevent="handleLogin">
      <input v-model="userId" class="login-input" placeholder="用户 ID" required />
      <input v-model="userName" class="login-input" placeholder="用户名" />
      <button type="submit" class="login-btn" :disabled="!userId">进入对话</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userId = ref('')
const userName = ref('')

function handleLogin() {
  if (!userId.value) return
  localStorage.setItem('agent_userId', userId.value)
  localStorage.setItem('agent_userName', userName.value || userId.value)
  // 无后端鉴权时直接进 chat 页（模板 demo 模式）
  router.replace('/chat')
}
</script>

<style scoped>
.login-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: #f7f8fa; }
.login-title { font-size: 28px; font-weight: 700; color: #1c1f23; margin: 0; }
.login-subtitle { font-size: 14px; color: #889099; margin: 8px 0 32px; }
.login-form { width: 100%; max-width: 300px; display: flex; flex-direction: column; gap: 14px; }
.login-input { height: 44px; padding: 0 14px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; outline: none; background: #fff; }
.login-input:focus { border-color: #ff6b35; }
.login-btn { height: 48px; border: 0; border-radius: 24px; background: #ff6b35; color: #fff; font-size: 15px; font-weight: 500; cursor: pointer; }
.login-btn:disabled { background: #ddd; color: #999; }
</style>
