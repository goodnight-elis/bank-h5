import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import path from 'path'
import chatRouter from './routes/chat.js'
import sessionRouter from './routes/session.js'
import fileRouter from './routes/file.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// API routes
app.use('/v1/chat', chatRouter)
app.use('/v1/session', sessionRouter)
app.use('/v1/file', fileRouter)

// Report API (reused from web)
app.use('/v1/report', sessionRouter) // placeholder, extend as needed

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: Date.now() }))

app.listen(PORT, () => {
  console.log(`[server] AI Agent mock backend running on http://localhost:${PORT}`)
})
