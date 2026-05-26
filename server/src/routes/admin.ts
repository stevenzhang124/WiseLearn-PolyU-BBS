import { Router } from 'express'
import { pool } from '../db'
import { adminOnly, authMiddleware, AuthRequest } from '../middleware/auth'

function userSearchLike(keyword: string): string {
  return `%${keyword.trim()}%`
}

async function ensureSensitiveWordsTableExists(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensitive_words (
      id INT AUTO_INCREMENT PRIMARY KEY,
      word VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

export const adminRouter = Router()

adminRouter.use(authMiddleware, adminOnly)
adminRouter.use(async (_req, _res, next) => {
  try { await ensureSensitiveWordsTableExists() } catch (err) { console.error('Ensure sensitive words table error', err) } finally { next() }
})

adminRouter.get('/stats', async (_req: AuthRequest, res) => {
  try {
    const [userCountRows] = await pool.query('SELECT COUNT(*) AS total FROM users')
    const [postCountRows] = await pool.query('SELECT COUNT(*) AS total FROM posts')
    const [dailyNewRows] = await pool.query(`SELECT DATE(created_at) AS date, COUNT(*) AS count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC`)
    const [weeklyNewRows] = await pool.query(`SELECT YEARWEEK(created_at, 1) AS week, COUNT(*) AS count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) GROUP BY YEARWEEK(created_at, 1) ORDER BY week ASC`)
    const [hotPostsRows] = await pool.query(`SELECT id, title, view_count FROM posts ORDER BY view_count DESC LIMIT 10`)
    const [recentUsersRows] = await pool.query(`SELECT id, nickname, email, created_at FROM users ORDER BY created_at DESC LIMIT 20`)
    res.json({ totalUsers: (userCountRows as any[])[0]?.total ?? 0, totalPosts: (postCountRows as any[])[0]?.total ?? 0, dailyNewUsers: dailyNewRows, weeklyNewUsers: weeklyNewRows, hotPostsTop10: hotPostsRows, recentUsers: recentUsersRows })
  } catch (err) {
    console.error('Admin stats error', err)
    res.status(500).json({ message: '获取统计信息失败' })
  }
})

adminRouter.get('/sensitive-words', async (_req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query('SELECT id, word, created_at, updated_at FROM sensitive_words ORDER BY word ASC')
    res.json({ list: rows })
  } catch (err) {
    console.error('List sensitive words error', err)
    res.status(500).json({ message: '获取敏感词失败' })
  }
})

adminRouter.post('/sensitive-words', async (req: AuthRequest, res) => {
  const word = typeof req.body?.word === 'string' ? req.body.word.trim().toLowerCase() : ''
  if (!word) return res.status(400).json({ message: '敏感词不能为空' })
  try {
    await pool.query('INSERT INTO sensitive_words (word) VALUES (?)', [word])
    res.json({ message: '已添加' })
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '敏感词已存在' })
    console.error('Add sensitive word error', err)
    res.status(500).json({ message: '添加失败' })
  }
})

adminRouter.delete('/sensitive-words/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ message: 'ID 不合法' })
  try {
    await pool.query('DELETE FROM sensitive_words WHERE id = ?', [id])
    res.json({ message: '已删除' })
  } catch (err) {
    console.error('Delete sensitive word error', err)
    res.status(500).json({ message: '删除失败' })
  }
})

adminRouter.get('/users', async (req: AuthRequest, res) => {
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : ''
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  try {
    const dbName = (await import('../config')).config.db.database
    const [colRows] = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'users'`,
      [dbName]
    )
    const colSet = new Set((colRows as any[]).map((r: { column_name: string }) => String(r.column_name).toLowerCase()))
    const hasEmail = colSet.has('email')
    const hasRole = colSet.has('role')
    const hasBlocked = colSet.has('is_blocked')
    const like = userSearchLike(keyword)
    const where = keyword
      ? `WHERE nickname LIKE ?${hasEmail ? ' OR email LIKE ?' : ''}`
      : ''
    const params: any[] = keyword ? [like, ...(hasEmail ? [like] : []), limit, offset] : [limit, offset]
    const selectSql = `SELECT id, nickname${hasEmail ? ', email' : ''}${hasRole ? ', role' : ''}${hasBlocked ? ', is_blocked' : ''}, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    const [rows] = await pool.query(selectSql, params)
    const list = (rows as any[]).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      email: u.email ?? '',
      role: u.role ?? 'user',
      is_blocked: Number(u.is_blocked ?? 0),
      created_at: u.created_at
    }))
    res.json({ list })
  } catch (err) {
    console.error('List users error', err)
    res.status(500).json({ message: '获取用户失败' })
  }
})

adminRouter.post('/users/:id/block', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { blocked } = req.body as { blocked?: boolean }
  if (Number.isNaN(id)) return res.status(400).json({ message: '用户 ID 不合法' })
  try {
    await pool.query('UPDATE users SET is_blocked = ? WHERE id = ?', [blocked ? 1 : 0, id])
    res.json({ message: blocked ? '已封禁' : '已解封' })
  } catch (err) {
    console.error('Block user error', err)
    res.status(500).json({ message: '操作失败' })
  }
})

adminRouter.post('/posts/:id/pin', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { pinned } = req.body as { pinned?: boolean }
  if (Number.isNaN(id)) return res.status(400).json({ message: '帖子 ID 不合法' })
  try { await pool.query('UPDATE posts SET is_pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]); res.json({ message: pinned ? '已置顶' : '已取消置顶' }) } catch (err) { console.error('Pin post error', err); res.status(500).json({ message: '操作失败' }) }
})

adminRouter.delete('/posts/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ message: '帖子 ID 不合法' })
  const conn = await pool.getConnection()
  try { await conn.beginTransaction(); await conn.query('UPDATE comments SET parent_comment_id = NULL WHERE post_id = ?', [id]); await conn.query('DELETE FROM comments WHERE post_id = ?', [id]); await conn.query('DELETE FROM likes WHERE post_id = ?', [id]); await conn.query('DELETE FROM posts WHERE id = ?', [id]); await conn.commit(); res.json({ message: '帖子已删除' }) } catch (err) { await conn.rollback(); console.error('Delete post error', err); res.status(500).json({ message: '删除失败' }) } finally { conn.release() }
})

adminRouter.get('/posts/search', async (req: AuthRequest, res) => {
  const keyword = (req.query.keyword as string) || ''
  try { const like = `%${keyword}%`; const [rows] = await pool.query('SELECT id, title, view_count, like_count, is_pinned, created_at FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT 100', [like, like]); res.json({ list: rows }) } catch (err) { console.error('Search posts error', err); res.status(500).json({ message: '搜索失败' }) }
})

adminRouter.get('/posts/pending', async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.title, p.user_id, u.nickname AS author, p.created_at, p.audit_reason
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.audit_status = 0
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [limit])
    res.json({ list: rows })
  } catch (err) { console.error('Pending posts error', err); res.status(500).json({ message: '获取待审核帖子失败' }) }
})

adminRouter.post('/posts/:id/approve', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ message: '帖子 ID 不合法' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [postRows] = await conn.query('SELECT id, user_id, title FROM posts WHERE id = ?', [id])
    const post = (postRows as any[])[0]
    if (!post) return res.status(404).json({ message: '帖子不存在' })
    await conn.query('UPDATE posts SET audit_status = 1, audit_reason = NULL, published_at = NOW() WHERE id = ?', [id])
    if (post.user_id !== req.user!.id) {
      const [langRows] = await conn.query('SELECT ui_lang FROM users WHERE id = ?', [post.user_id])
      const isEn = (langRows as any[])[0]?.ui_lang === 'en'
      const content = isEn ? `Admin approved your post 《${post.title}》 and it is now published.` : `管理员已通过审核：你的帖子《${post.title}》已发布。`
      await conn.query('INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)', [req.user!.id, post.user_id, content])
    }
    await conn.commit(); res.json({ message: '审核通过' })
  } catch (err) { await conn.rollback(); console.error('Approve post error', err); res.status(500).json({ message: '审核失败' }) } finally { conn.release() }
})

adminRouter.post('/posts/:id/reject', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ message: '帖子 ID 不合法' })
  const { reason } = req.body as { reason?: string }
  const trimmed = typeof reason === 'string' ? reason.trim() : ''
  if (!trimmed) return res.status(400).json({ message: '需要提供整改意见' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [postRows] = await conn.query('SELECT id, user_id, title FROM posts WHERE id = ?', [id])
    const post = (postRows as any[])[0]
    if (!post) return res.status(404).json({ message: '帖子不存在' })
    await conn.query('UPDATE posts SET audit_status = 0, audit_reason = ? WHERE id = ?', [trimmed, id])
    if (post.user_id !== req.user!.id) {
      const [langRows] = await conn.query('SELECT ui_lang FROM users WHERE id = ?', [post.user_id])
      const isEn = (langRows as any[])[0]?.ui_lang === 'en'
      const content = isEn ? `Admin rejected your post 《${post.title}》.\nFeedback: ${trimmed}\nPlease revise and resubmit.` : `管理员未通过审核：你的帖子《${post.title}》需整改。\n整改意见：${trimmed}\n请修改后等待再次审核。`
      await conn.query('INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)', [req.user!.id, post.user_id, content])
    }
    await conn.commit(); res.json({ message: '已反馈整改意见' })
  } catch (err) { await conn.rollback(); console.error('Reject post error', err); res.status(500).json({ message: '审核失败' }) } finally { conn.release() }
})
