/**
 * 简单文件存储（开发阶段无需数据库）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

function readSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function writeSessions(sessions) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
}

export function createSession(userId, title = '新会话') {
  const sessions = readSessions()
  const session = {
    session_id: randomUUID(),
    user_id: userId,
    title,
    status: 'active',
    created_at: new Date().toISOString(),
    messages: [],
  }
  sessions.unshift(session)
  writeSessions(sessions)
  return session
}

export function getSessions(userId) {
  const sessions = readSessions()
  return sessions.filter(s => s.user_id === userId)
}

export function getSession(sessionId) {
  return readSessions().find(s => s.session_id === sessionId) || null
}

export function deleteSessions(ids) {
  let sessions = readSessions()
  sessions = sessions.filter(s => !ids.includes(s.session_id))
  writeSessions(sessions)
}

export function updateSessionTitle(sessionId, title) {
  const sessions = readSessions()
  const s = sessions.find(s => s.session_id === sessionId)
  if (s) { s.title = title; writeSessions(sessions) }
  return s
}
