import { Router } from 'express'
import { handleStreamChat } from '../services/sseMock.js'
import { getSessions, getSession } from '../services/store.js'

const router = Router()

// POST /v1/chat/stream - SSE 流式对话
router.post('/stream', handleStreamChat)

// GET /v1/chat/history/session/list/:userId - 获取会话列表
router.get('/history/session/list/:userId', (req, res) => {
  const sessions = getSessions(req.params.userId)
  res.json({ user_id: req.params.userId, sessions: sessions.map(s => ({ session_id: s.session_id, title: s.title, status: s.status, created_at: s.created_at })), count: sessions.length })
})

// GET /v1/chat/history/:sessionId - 获取消息历史
router.get('/history/:sessionId', (req, res) => {
  const s = getSession(req.params.sessionId)
  if (!s) return res.json({ session_id: req.params.sessionId, messages: [], count: 0 })
  res.json({ session_id: s.session_id, messages: s.messages || [], count: (s.messages || []).length })
})

// GET /v1/chat/tips - 快捷建议
router.get('/tips', (_, res) => {
  res.json({ tips: ['帮我写一份报告', '分析这个数据', '给出建议方案'] })
})

// GET /v1/chat_gdn/guidance/:sessionId - 初始化引导语
router.get('/guidance/:sessionId', (req, res) => {
  res.send('你好！我是 AI 智能助手，有什么可以帮你的吗？')
})

export default router
