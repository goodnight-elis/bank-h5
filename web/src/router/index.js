import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    // APP 打开 H5 直接进入对话页
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: {
      title: '新对话'
    }
  },
  {
    path: '/chat/:id',
    name: 'ChatSession',
    component: () => import('@/views/Chat.vue'),
    meta: {
      title: '对话'
    }
  },
   {
    path: '/report-detail',
    name: 'ReportDetail',
    component: () => import('@/views/ReportDetail.vue'),
    meta: {
      title: '访后报告记录'
    }
  },
  {
    path: '/report-history',
    name: 'ReportHistory',
    component: () => import('@/views/ReportHistory.vue'),
    meta: {
      title: '历史报告'
    }
  },
  {
    path: '/markdown-view',
    name: 'MarkdownView',
    component: () => import('@/views/MarkdownView.vue'),
    meta: {
      title: '文档'
    }
  },
        {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
      },{
    // 兜底路由：未匹配的地址统一展示 404 页
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面不存在'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'AI智能体'
  next()
})

export default router

