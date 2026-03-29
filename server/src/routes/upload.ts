import express, { Router } from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { MAX_UPLOAD_IMAGE_BYTES, processUploadedImage } from '../utils/processUploadedImage'

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
  limits: { fileSize: MAX_UPLOAD_IMAGE_BYTES },
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

/** Multer / 图片处理统一错误响应 */
export function uploadImageErrorHandler(
  err: Error & { code?: string },
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ message: '单张图片不能超过 60MB' })
    return
  }
  res.status(400).json({ message: err.message || '上传失败' })
}

export const uploadRouter = Router()

uploadRouter.use(authMiddleware)

/**
 * 上传单张图片，返回可访问的 URL（服务端会压缩为 WebP）
 * POST /api/upload/image, multipart field: file
 */
uploadRouter.post(
  '/image',
  upload.single('file'),
  async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.file) {
      res.status(400).json({ message: '请选择要上传的图片' })
      return
    }
    try {
      const { filename } = await processUploadedImage(req.file.path, 'post')
      const baseUrl = process.env.API_BASE_URL || `http://localhost:4000`
      const url = `${baseUrl}/uploads/${filename}`
      res.json({ url })
    } catch (err) {
      next(err)
    }
  },
  uploadImageErrorHandler
)
