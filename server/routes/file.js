import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const upload = multer({ dest: path.join(__dirname, '..', 'data', 'uploads') })

const router = Router()

// POST /v1/file/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })
  const fileId = randomUUID()
  res.json({
    fileId,
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
  })
})

export default router
