import { Router } from 'express'
import { pool } from '../db'
import { adminOnly, authMiddleware, AuthRequest } from '../middleware/auth'

export const adminRouter = Router()

// 仅管理员可访问
adminRouter.use(authMiddleware, adminOnly)

/**
 * 数据统计概览：
 * - 总用户数
 * - 总帖子数
 * - 日/周新增用户数
 * - 热门帖子 TOP10（按浏览量）
 */
adminRouter.get('/stats', async (_req: AuthRequest, res) => {
  try {
    const [userCountRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM users'
    )
    const [postCountRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM posts'
    )
    const [dailyNewRows] = await pool.query(
      `
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `
    )
    const [weeklyNewRows] = await pool.query(
      `
      SELECT YEARWEEK(created_at, 1) AS week, COUNT(*) AS count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
      GROUP BY YEARWEEK(created_at, 1)
      ORDER BY week ASC
    `
    )
    const [hotPostsRows] = await pool.query(
      `
      SELECT id, title, view_count
      FROM posts
      ORDER BY view_count DESC
      LIMIT 10
    `
    )

    res.json({
      totalUsers: (userCountRows as any[])[0]?.total ?? 0,
      totalPosts: (postCountRows as any[])[0]?.total ?? 0,
      dailyNewUsers: dailyNewRows,
      weeklyNewUsers: weeklyNewRows,
      hotPostsTop10: hotPostsRows
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Admin stats error', err)
    res.status(500).json({ message: '获取统计信息失败' })
  }
})

/**
 * 帖子管理：置顶 / 取消置顶
 */
adminRouter.post('/posts/:id/pin', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { pinned } = req.body as { pinned?: boolean }

  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  try {
    await pool.query(
      'UPDATE posts SET is_pinned = ? WHERE id = ?',
      [pinned ? 1 : 0, id]
    )
    res.json({ message: pinned ? '已置顶' : '已取消置顶' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Pin post error', err)
    res.status(500).json({ message: '操作失败' })
  }
})

/**
 * 删除违规帖子
 */
adminRouter.delete('/posts/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  try {
    await pool.query('DELETE FROM posts WHERE id = ?', [id])
    res.json({ message: '帖子已删除' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete post error', err)
    res.status(500).json({ message: '删除失败' })
  }
})

/**
 * 帖子搜索（按关键词）
 */
adminRouter.get('/posts/search', async (req: AuthRequest, res) => {
  const keyword = (req.query.keyword as string) || ''

  try {
    const like = `%${keyword}%`
    const [rows] = await pool.query(
      `
      SELECT id, title, view_count, like_count, created_at
      FROM posts
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY created_at DESC
      LIMIT 100
    `,
      [like, like]
    )
    res.json({ list: rows })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Search posts error', err)
    res.status(500).json({ message: '搜索失败' })
  }
})

