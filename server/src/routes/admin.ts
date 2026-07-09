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
 * 删除违规帖子（先删该帖下的评论、点赞，再删帖子，避免外键约束报错）
 */
adminRouter.delete('/posts/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // 评论有 parent_comment_id 自引用，先置空再删
    await conn.query('UPDATE comments SET parent_comment_id = NULL WHERE post_id = ?', [id])
    await conn.query('DELETE FROM comments WHERE post_id = ?', [id])
    await conn.query('DELETE FROM likes WHERE post_id = ?', [id])
    await conn.query('DELETE FROM posts WHERE id = ?', [id])
    await conn.commit()
    res.json({ message: '帖子已删除' })
  } catch (err) {
    await conn.rollback()
    // eslint-disable-next-line no-console
    console.error('Delete post error', err)
    res.status(500).json({ message: '删除失败' })
  } finally {
    conn.release()
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
      SELECT id, title, view_count, like_count, is_pinned, created_at
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

/**
 * 获取待审核帖子（管理员审核用）
 */
adminRouter.get('/posts/pending', async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100)

  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.title,
        p.user_id,
        u.nickname AS author,
        p.created_at,
        p.audit_reason
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.audit_status = 0
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
      [limit]
    )
    res.json({ list: rows })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Pending posts error', err)
    res.status(500).json({ message: '获取待审核帖子失败' })
  }
})

/**
 * 审核通过：更新审核状态 + 给发帖用户发私信通知
 */
adminRouter.post('/posts/:id/approve', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [postRows] = await conn.query(
      'SELECT id, user_id, title FROM posts WHERE id = ?',
      [id]
    )
    const post = (postRows as any[])[0]
    if (!post) {
      res.status(404).json({ message: '帖子不存在' })
      return
    }

    await conn.query(
      'UPDATE posts SET audit_status = 1, audit_reason = NULL, published_at = NOW() WHERE id = ?',
      [id]
    )

    if (post.user_id !== req.user!.id) {
      const [langRows] = await conn.query(
        'SELECT ui_lang FROM users WHERE id = ?',
        [post.user_id]
      )
      const uiLang = (langRows as any[])[0]?.ui_lang
      const isEn = uiLang === 'en'
      const content = isEn
        ? `Admin approved your post 《${post.title}》 and it is now published.`
        : `管理员已通过审核：你的帖子《${post.title}》已发布。`
      await conn.query(
        'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
        [req.user!.id, post.user_id, content]
      )
    }

    await conn.commit()
    res.json({ message: '审核通过' })
  } catch (err) {
    await conn.rollback()
    // eslint-disable-next-line no-console
    console.error('Approve post error', err)
    res.status(500).json({ message: '审核失败' })
  } finally {
    conn.release()
  }
})

/**
 * 审核不通过：更新审核状态 + 保存整改意见 + 发私信给用户
 */
adminRouter.post('/posts/:id/reject', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  const { reason } = req.body as { reason?: string }
  const trimmed = typeof reason === 'string' ? reason.trim() : ''
  if (!trimmed) {
    res.status(400).json({ message: '需要提供整改意见' })
    return
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [postRows] = await conn.query(
      'SELECT id, user_id, title FROM posts WHERE id = ?',
      [id]
    )
    const post = (postRows as any[])[0]
    if (!post) {
      res.status(404).json({ message: '帖子不存在' })
      return
    }

    await conn.query(
      'UPDATE posts SET audit_status = 0, audit_reason = ? WHERE id = ?',
      [trimmed, id]
    )

    if (post.user_id !== req.user!.id) {
      const [langRows] = await conn.query(
        'SELECT ui_lang FROM users WHERE id = ?',
        [post.user_id]
      )
      const uiLang = (langRows as any[])[0]?.ui_lang
      const isEn = uiLang === 'en'
      const content = isEn
        ? `Admin rejected your post 《${post.title}》.\nFeedback: ${trimmed}\nPlease revise and resubmit.`
        : `管理员未通过审核：你的帖子《${post.title}》需整改。\n整改意见：${trimmed}\n请修改后等待再次审核。`
      await conn.query(
        'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
        [req.user!.id, post.user_id, content]
      )
    }

    await conn.commit()
    res.json({ message: '已反馈整改意见' })
  } catch (err) {
    await conn.rollback()
    // eslint-disable-next-line no-console
    console.error('Reject post error', err)
    res.status(500).json({ message: '审核失败' })
  } finally {
    conn.release()
  }
})

