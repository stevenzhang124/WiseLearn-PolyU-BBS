import express, { Router } from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i
    if (allowed.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持图片：JPEG/PNG/GIF/WEBP'))
    }
  }
})

export { upload }
export const uploadRouter = Router()

uploadRouter.use(authMiddleware)

/**
 * 上传单张图片，返回可访问的 URL
 * POST /api/upload/image, multipart field: file
 */
uploadRouter.post(
  '/image',
  upload.single('file'),
  (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ message: '请选择要上传的图片' })
      return
    }
    const baseUrl = process.env.API_BASE_URL || `http://localhost:4000`
    const url = `${baseUrl}/uploads/${req.file.filename}`
    res.json({ url })
  },
  (err: Error, _req: express.Request, res: express.Response) => {
    res.status(400).json({ message: err.message || '上传失败' })
  }
)
