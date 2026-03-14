import { Router } from 'express'
import { pool } from '../db'
import { AuthRequest, authMiddleware } from '../middleware/auth'

export const messageRouter = Router()

// 所有私信接口均需要登录
messageRouter.use(authMiddleware)

/**
 * 发送私信
 */
messageRouter.post('/', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const { toUserId, content } = req.body as {
    toUserId?: number
    content?: string
  }

  if (!toUserId || !content) {
    res.status(400).json({ message: '收件人和内容不能为空' })
    return
  }

  if (toUserId === req.user.id) {
    res.status(400).json({ message: '不能给自己发送私信' })
    return
  }

  try {
    await pool.query(
      'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
      [req.user.id, toUserId, content]
    )
    res.json({ message: '发送成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Send message error', err)
    res.status(500).json({ message: '发送失败，请稍后重试' })
  }
})

/**
 * 获取与某个用户的私信会话
 */
messageRouter.get('/conversation/:userId', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const otherId = Number(req.params.userId)
  if (Number.isNaN(otherId)) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.id,
        m.content,
        m.created_at,
        m.is_read,
        m.from_user_id,
        m.to_user_id
      FROM messages m
      WHERE (m.from_user_id = ? AND m.to_user_id = ?)
         OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
    `,
      [req.user.id, otherId, otherId, req.user.id]
    )

    // 将发给当前用户且未读的消息标记为已读
    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE to_user_id = ? AND from_user_id = ? AND is_read = 0',
      [req.user.id, otherId]
    )

    res.json({ messages: rows })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get conversation error', err)
    res.status(500).json({ message: '获取会话失败' })
  }
})

/**
 * 获取未读消息数量，用于顶部提醒
 */
messageRouter.get('/unread-count', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM messages WHERE to_user_id = ? AND is_read = 0',
      [req.user.id]
    )
    const count = (rows as any[])[0]?.count ?? 0
    res.json({ count })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get unread count error', err)
    res.status(500).json({ message: '获取未读消息数量失败' })
  }
})

