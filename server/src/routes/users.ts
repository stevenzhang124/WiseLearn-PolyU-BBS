import express, { Router } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { upload } from './upload'

export const usersRouter = Router()

usersRouter.use(authMiddleware)

const baseUrl = () => process.env.API_BASE_URL || 'http://localhost:4000'

/**
 * 根据用户 ID 获取昵称和头像
 */
usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }

  try {
    const [rows] = await pool.query('SELECT id, nickname FROM users WHERE id = ?', [id])
    const user = (rows as any[])[0]
    if (!user) {
      res.status(404).json({ message: '用户不存在' })
      return
    }
    let avatar: string | null = null
    try {
      const [avRows] = await pool.query('SELECT avatar FROM users WHERE id = ?', [id])
      const av = (avRows as any[])[0]
      if (av?.avatar) avatar = `${baseUrl()}${av.avatar}`
    } catch {
      // avatar 列可能不存在
    }
    res.json({
      id: user.id,
      nickname: user.nickname,
      avatar
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get user error', err)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

/**
 * 上传当前用户头像
 * PUT /api/users/me/avatar, multipart field: file
 */
usersRouter.put(
  '/me/avatar',
  upload.single('file'),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: '未登录' })
      return
    }
    if (!req.file) {
      res.status(400).json({ message: '请选择要上传的图片' })
      return
    }
    const avatarPath = `/uploads/${req.file.filename}`
    try {
      await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [
        avatarPath,
        req.user.id
      ])
      res.json({ avatar: `${baseUrl()}${avatarPath}` })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Update avatar error', err)
      res.status(500).json({ message: '头像更新失败' })
    }
  },
  (err: Error, _req: express.Request, res: express.Response) => {
    res.status(400).json({ message: err.message || '上传失败' })
  }
)
