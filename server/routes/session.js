import { Router } from 'express'
import { createSession, getSessions, getSession, deleteSessions, updateSessionTitle } from '../services/store.js'

const router = Router()

// POST /v1/session/create
router.post('/create', (req, res) => {
  const { user_id, title } = req.body
  const session = createSession(user_id || 'anonymous', title)
  res.json(session)
})

// GET /v1/session/:sessionId
router.get('/:sessionId', (req, res) => {
  const s = getSession(req.params.sessionId)
  if (!s) return res.status(404).json({ error: 'Session not found' })
  res.json(s)
})

// GET /v1/chat/history/session/list/:userId (mounted under /v1/session, but frontend calls /v1/chat/history/...)
// Handled separately in chat router or mount this at a different path

// DELETE /v1/session/batch-delete (alias for report batch-delete compat)
router.post('/batch-delete', (req, res) => {
  const { sessionIds } = req.body
  if (Array.isArray(sessionIds)) deleteSessions(sessionIds)
  res.json({ success: true, deleted: sessionIds?.length || 0 })
})

// PUT /v1/session/:sessionId/title
router.put('/:sessionId/title', (req, res) => {
  const { title } = req.body
  const s = updateSessionTitle(req.params.sessionId, title)
  res.json(s || { error: 'not found' })
})

export default router
