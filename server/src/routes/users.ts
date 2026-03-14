import { Router } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

usersRouter.use(authMiddleware)

/**
 * 根据用户 ID 获取昵称（用于私信等场景展示对方名称）
 */
usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nickname FROM users WHERE id = ?',
      [id]
    )
    const user = (rows as any[])[0]
    if (!user) {
      res.status(404).json({ message: '用户不存在' })
      return
    }
    res.json({ id: user.id, nickname: user.nickname })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get user error', err)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})
