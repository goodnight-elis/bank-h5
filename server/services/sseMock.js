/**
 * SSE Mock 流式输出服务
 * 模拟 LLM 逐字返回 + 工具调用卡片
 */
import { randomUUID } from 'crypto'

const MOCK_REPLIES = [
  '你好！我是 AI 智能助手，很高兴为你服务。今天有什么可以帮你的吗？',
  '这是一个模拟的流式回复。我会逐字输出内容，让你体验 SSE 流式效果。\n\n以下是一些功能演示：\n\n1. **Markdown 渲染**\n2. 列表支持\n3. 工具调用卡片',
  '收到你的问题，让我来分析一下。\n\n首先，我们需要明确几个关键点：\n\n- 需求分析\n- 方案设计\n- 实现路径\n\n让我为你生成一份详细报告。',
]

function pickReply() {
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function splitChunks(text, min = 2, max = 6) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    const len = min + Math.floor(Math.random() * (max - min))
    chunks.push(text.slice(i, i + len))
    i += len
  }
  return chunks
}

/**
 * 向 res 写入一条 SSE 消息
 */
function writeSSE(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n`)
  res.write('\n')  // 双换行的第二个
}

/**
 * 处理流式对话请求
 * POST /v1/chat/stream
 */
export async function handleStreamChat(req, res) {
  const { session_id, message } = req.body

  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const replyText = pickReply()
  const chunks = splitChunks(replyText)
  const messageId = `msg_${Date.now()}_${randomUUID().slice(0, 8)}`

  // 逐块发送文本
  for (const chunk of chunks) {
    if (res.destroyed) return // 客户端已断开
    writeSSE(res, 'message', { type: 'content', delta: chunk, format: 'markdown' })
    await sleep(50 + Math.random() * 100)
  }

  // 发送 message_id
  writeSSE(res, 'message', { type: 'message_id', message_id: messageId })

  // 模拟工具调用卡片（50% 概率）
  if (Math.random() > 0.5) {
    await sleep(200)
    writeSSE(res, 'card', {
      type: 'tool_result',
      toolName: 'report',
      data: {
        title: '分析报告已生成',
        description: `基于 "${message || '用户提问'}" 生成`,
        date: new Date().toLocaleString('zh-CN'),
        reportId: `rpt_${randomUUID().slice(0, 8)}`,
      }
    })
  }

  // 发送快捷胶囊
  writeSSE(res, 'message', { type: 'chips', data: ['继续对话', '生成报告', '换个话题'] })

  // 结束
  writeSSE(res, 'done', { message_id: messageId })
  writeSSE(res, 'message', '[DONE]')
  res.end()
}
