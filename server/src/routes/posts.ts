import { Router } from 'express'
import { pool } from '../db'
import { AuthRequest, authMiddleware } from '../middleware/auth'

export const postRouter = Router()

/** 与前端 FeedTabs / 发帖分类一致 */
const FEED_CATEGORIES = [
  'campus',
  'teaching',
  'news',
  'trading',
  'career',
  'mutual'
] as const

// 所有帖子接口均需要登录
postRouter.use(authMiddleware)

/**
 * 创建帖子（支持富文本内容和图片 URL 列表）
 */
postRouter.post('/', async (req: AuthRequest, res) => {
  const { title, content, category, imageUrls } = req.body as {
    title?: string
    content?: string
    category?: string
    imageUrls?: string[]
  }

  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  if (!title || !content || !category) {
    res.status(400).json({ message: '标题、内容和分类为必填' })
    return
  }
  if ([...title].length > 20) {
    res.status(400).json({ message: '标题不能超过 20 个字' })
    return
  }

  try {
    const images = Array.isArray(imageUrls) ? imageUrls.join(',') : null
    await pool.query(
      'INSERT INTO posts (user_id, title, content, category, image_urls, audit_status, audit_reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, content, category, images, 0, null]
    )
    res.json({ message: '发帖成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create post error', err)
    res.status(500).json({ message: '发帖失败，请稍后重试' })
  }
})

/**
 * 获取帖子列表（分页 + 排序：time / hot）
 */
postRouter.get('/', async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 50)
  const sort = (req.query.sort as string) || 'time'
  const rawCategory = typeof req.query.category === 'string' ? req.query.category : undefined
  const categoryFilter =
    rawCategory &&
    rawCategory !== 'all' &&
    (FEED_CATEGORIES as readonly string[]).includes(rawCategory)
      ? rawCategory
      : undefined

  const offset = (page - 1) * pageSize

  // 置顶帖子始终排在最前；"最新"按审核通过时间倒序（回退到创建时间）；"热门"按热度倒序
  let orderBy = 'p.is_pinned DESC, COALESCE(p.published_at, p.created_at) DESC'
  if (sort === 'hot') {
    orderBy = 'p.is_pinned DESC, (p.view_count + p.like_count * 2) DESC, COALESCE(p.published_at, p.created_at) DESC'
  }

  try {
    const isAdmin = Boolean(req.user?.isAdmin)
    const conditions: string[] = []
    const listParams: (number | string)[] = []
    if (!isAdmin) {
      conditions.push('p.audit_status = 1')
    }
    if (categoryFilter) {
      conditions.push('p.category = ?')
      listParams.push(categoryFilter)
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [listRows] = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_urls,
        p.is_pinned,
        p.created_at,
        p.view_count,
        p.like_count,
        u.nickname AS author,
        u.avatar AS author_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
      [...listParams, pageSize, offset]
    )
    const listBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
    const list = (listRows as any[]).map((p) => ({
      ...p,
      author_avatar: p.author_avatar ? `${listBaseUrl}${p.author_avatar}` : null
    }))

    const countConditions: string[] = []
    const countParams: string[] = []
    if (!isAdmin) {
      countConditions.push('audit_status = 1')
    }
    if (categoryFilter) {
      countConditions.push('category = ?')
      countParams.push(categoryFilter)
    }
    const countWhere =
      countConditions.length > 0 ? `WHERE ${countConditions.join(' AND ')}` : ''
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM posts ${countWhere}`,
      countParams
    )
    const total = (countRows as any[])[0]?.total ?? 0

    res.json({
      list,
      pagination: {
        page,
        pageSize,
        total
      }
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List posts error', err)
    res.status(500).json({ message: '获取帖子列表失败' })
  }
})

/**
 * 编辑帖子（仅作者本人）
 * body: { title, content, category, imageUrls? }
 */
postRouter.put('/:id', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }
  const { title, content, category, imageUrls } = req.body as {
    title?: string
    content?: string
    category?: string
    imageUrls?: string[]
  }
  if (!title || !content || !category) {
    res.status(400).json({ message: '标题、内容和分类为必填' })
    return
  }
  if ([...title].length > 20) {
    res.status(400).json({ message: '标题不能超过 20 个字' })
    return
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = ?',
      [id]
    )
    const post = (rows as any[])[0]
    if (!post) {
      res.status(404).json({ message: '帖子不存在' })
      return
    }
    if (post.user_id !== req.user.id) {
      res.status(403).json({ message: '只能编辑自己的帖子' })
      return
    }
    const images = Array.isArray(imageUrls) ? imageUrls.join(',') : null
    await pool.query(
      'UPDATE posts SET title = ?, content = ?, category = ?, image_urls = ?, audit_status = 0, audit_reason = NULL WHERE id = ?',
      [title, content, category, images, id]
    )
    res.json({ message: '更新成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update post error', err)
    res.status(500).json({ message: '更新失败，请稍后重试' })
  }
})

/**
 * 获取帖子详情（并自增浏览量）
 */
postRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  try {
    const isAdmin = Boolean(req.user?.isAdmin)
    await pool.query(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = ? AND (audit_status = 1 OR user_id = ? OR ? = 1)',
      [id, req.user!.id, isAdmin ? 1 : 0]
    )

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        u.nickname AS author,
        u.avatar AS author_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND (p.audit_status = 1 OR p.user_id = ? OR ? = 1)
    `,
      [id, req.user!.id, isAdmin ? 1 : 0]
    )
    const post = (rows as any[])[0]
    if (post && post.author_avatar) {
      post.author_avatar = `${baseUrl}${post.author_avatar}`
    }
    if (!post) {
      res.status(404).json({ message: '帖子不存在' })
      return
    }

    const [commentRows] = await pool.query(
      `
      SELECT
        c.id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        u.nickname AS author,
        u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `,
      [id]
    )
    const postUserId = post.user_id
    const comments = (commentRows as any[]).map((c) => ({
      ...c,
      author_avatar: c.author_avatar ? `${baseUrl}${c.author_avatar}` : null,
      is_author: c.user_id === postUserId
    }))

    res.json({ post, comments })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get post error', err)
    res.status(500).json({ message: '获取帖子详情失败' })
  }
})

/**
 * 对帖子发表评论或回复评论（支持两级）
 */
postRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const postId = Number(req.params.id)
  const { content, parentCommentId } = req.body as {
    content?: string
    parentCommentId?: number
  }

  if (!content) {
    res.status(400).json({ message: '评论内容不能为空' })
    return
  }

  try {
    const isAdmin = Boolean(req.user?.isAdmin)
    const [pRows] = await pool.query(
      'SELECT id FROM posts WHERE id = ? AND (audit_status = 1 OR user_id = ? OR ? = 1)',
      [postId, req.user!.id, isAdmin ? 1 : 0]
    )
    if ((pRows as any[]).length === 0) {
      res.status(403).json({ message: '该帖子未通过审核，无法评论' })
      return
    }
    await pool.query(
      'INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, content, parentCommentId ?? null]
    )
    res.json({ message: '评论成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create comment error', err)
    res.status(500).json({ message: '评论失败，请稍后重试' })
  }
})

/**
 * 删除本人评论
 */
postRouter.delete('/comments/:commentId', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const id = Number(req.params.commentId)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '评论 ID 不合法' })
    return
  }

  try {
    const [rows] = await pool.query(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )
    const result = rows as any
    if (result.affectedRows === 0) {
      res.status(403).json({ message: '只能删除自己的评论' })
      return
    }
    res.json({ message: '删除成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete comment error', err)
    res.status(500).json({ message: '删除评论失败' })
  }
})

/**
 * 点赞 / 取消点赞
 */
postRouter.post('/:id/like', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const postId = Number(req.params.id)
  if (Number.isNaN(postId)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  try {
    const isAdmin = Boolean(req.user?.isAdmin)
    const [pRows] = await pool.query(
      'SELECT id FROM posts WHERE id = ? AND (audit_status = 1 OR user_id = ? OR ? = 1)',
      [postId, req.user!.id, isAdmin ? 1 : 0]
    )
    if ((pRows as any[]).length === 0) {
      res.status(403).json({ message: '该帖子未通过审核，无法点赞' })
      return
    }
    const [rows] = await pool.query(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    )
    const existing = (rows as any[])[0]

    if (existing) {
      await pool.query(
        'DELETE FROM likes WHERE id = ?',
        [existing.id]
      )
      await pool.query(
        'UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
        [postId]
      )
      res.json({ liked: false })
    } else {
      await pool.query(
        'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
        [postId, req.user.id]
      )
      await pool.query(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
        [postId]
      )
      res.json({ liked: true })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Toggle like error', err)
    res.status(500).json({ message: '操作失败，请稍后重试' })
  }
})

/**
 * 生成转发链接（前端可直接用该链接分享）
 */
postRouter.get('/:id/share-link', async (req: AuthRequest, res) => {
  const postId = Number(req.params.id)
  if (Number.isNaN(postId)) {
    res.status(400).json({ message: '帖子 ID 不合法' })
    return
  }

  const baseUrl = req.headers.origin || `http://localhost:5173`
  const link = `${baseUrl}/posts/${postId}`
  res.json({ link })
})

/**
 * 获取个人发帖 / 评论 / 点赞记录（用于个人中心）
 */
postRouter.get('/me/activities', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  try {
    const [posts] = await pool.query(
      'SELECT id, title, created_at, audit_status, audit_reason FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    )

    const [comments] = await pool.query(
      `
      SELECT c.id, c.content, c.created_at, c.post_id, p.title AS post_title
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 100
    `,
      [req.user.id]
    )

    const [likes] = await pool.query(
      `
      SELECT l.id, l.created_at, l.post_id, p.title AS post_title
      FROM likes l
      JOIN posts p ON l.post_id = p.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT 100
    `,
      [req.user.id]
    )

    res.json({ posts, comments, likes })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get activities error', err)
    res.status(500).json({ message: '获取个人记录失败' })
  }
})

