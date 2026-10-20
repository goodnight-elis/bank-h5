<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="code">404</div>
      <p class="tip">页面不存在或已被移除</p>
      <van-button class="back-btn" type="primary" block round @click="goHome">返回首页</van-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 用 replace 跳转，避免 404 页留在历史记录中
function goHome() {
  router.replace('/chat')
}
</script>

<style scoped lang="less">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 32px;
  /* 适配刘海屏/底部横条，与 Chat.vue 保持 env() 直接写法 */
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  background: #ffffff;

  .not-found-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .code {
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    color: #e0e3e8;
    letter-spacing: 4px;
  }

  .tip {
    margin: 16px 0 40px;
    font-size: 15px;
    color: #999999;
    text-align: center;
  }

  .back-btn {
    width: 60%;
    height: 44px;
    font-size: 16px;
  }
}
</style>
