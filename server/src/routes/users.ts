import { Router, type Response, type NextFunction } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { upload, uploadImageErrorHandler } from './upload'
import { processUploadedImage } from '../utils/processUploadedImage'

export const usersRouter = Router()

usersRouter.use(authMiddleware)

const baseUrl = () => process.env.API_BASE_URL || 'http://localhost:4000'

function parseUserId(param: string): number | null {
  const id = Number(param)
  return Number.isNaN(id) ? null : id
}

/**
 * 当前用户资料（个人中心用）：含关注数、粉丝数、收到总赞数
 */
usersRouter.get('/me/profile', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const id = req.user.id
  try {
    const [uRows] = await pool.query('SELECT id, nickname FROM users WHERE id = ?', [id])
    const user = (uRows as any[])[0]
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
      // ignore
    }
    const [postCountRows] = await pool.query('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?', [id])
    const postCount = (postCountRows as any[])[0]?.c ?? 0
    let followerCount = 0
    let followingCount = 0
    try {
      const [fcRows] = await pool.query('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?', [id])
      followerCount = (fcRows as any[])[0]?.c ?? 0
      const [flRows] = await pool.query('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?', [id])
      followingCount = (flRows as any[])[0]?.c ?? 0
    } catch {
      // ignore
    }
    const [likesRows] = await pool.query(
      'SELECT COALESCE(SUM(like_count), 0) AS total FROM posts WHERE user_id = ?',
      [id]
    )
    const totalLikes = Number((likesRows as any[])[0]?.total ?? 0)
    res.json({
      id: user.id,
      nickname: user.nickname,
      avatar,
      postCount,
      followerCount,
      followingCount,
      totalLikes
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get me profile error', err)
    res.status(500).json({ message: '获取资料失败' })
  }
})

/**
 * 用户公开资料页：昵称、头像、发帖数、粉丝数、获赞数、当前用户是否已关注
 * 兼容：follows 表或 avatar 列不存在时仍可返回资料
 */
usersRouter.get('/:id/profile', async (req: AuthRequest, res) => {
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }

  try {
    const [uRows] = await pool.query(
      'SELECT id, nickname FROM users WHERE id = ?',
      [id]
    )
    const user = (uRows as any[])[0]
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

    const [postCountRows] = await pool.query(
      'SELECT COUNT(*) AS c FROM posts WHERE user_id = ?',
      [id]
    )
    const postCount = (postCountRows as any[])[0]?.c ?? 0

    let followerCount = 0
    try {
      const [fcRows] = await pool.query(
        'SELECT COUNT(*) AS c FROM follows WHERE following_id = ?',
        [id]
      )
      followerCount = (fcRows as any[])[0]?.c ?? 0
    } catch {
      // follows 表可能不存在，忽略
    }

    const [likesRows] = await pool.query(
      'SELECT COALESCE(SUM(like_count), 0) AS total FROM posts WHERE user_id = ?',
      [id]
    )
    const totalLikes = Number((likesRows as any[])[0]?.total ?? 0)

    let isFollowing = false
    if (req.user && req.user.id !== id) {
      try {
        const [fr] = await pool.query(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
          [req.user.id, id]
        )
        isFollowing = (fr as any[]).length > 0
      } catch {
        // follows 表可能不存在
      }
    }

    res.json({
      id: user.id,
      nickname: user.nickname,
      avatar,
      postCount,
      followerCount,
      totalLikes,
      isFollowing
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get profile error', err)
    res.status(500).json({ message: '获取用户资料失败' })
  }
})

/**
 * 关注用户
 */
usersRouter.post('/:id/follow', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }
  if (id === req.user.id) {
    res.status(400).json({ message: '不能关注自己' })
    return
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE id = ?', [id])
    if ((exists as any[]).length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }
    await pool.query(
      'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [req.user.id, id]
    )
    res.json({ message: '关注成功' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Follow error', err)
    res.status(500).json({ message: '操作失败' })
  }
})

/**
 * 取消关注
 */
usersRouter.delete('/:id/follow', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }

  try {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, id]
    )
    res.json({ message: '已取消关注' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unfollow error', err)
    res.status(500).json({ message: '操作失败' })
  }
})

/**
 * 关注的人列表（该用户关注了谁）
 */
usersRouter.get('/:id/following', async (req: AuthRequest, res) => {
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.nickname, u.avatar
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC
       LIMIT 200`,
      [id]
    )
    const list = (rows as any[]).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      avatar: r.avatar ? `${baseUrl()}${r.avatar}` : null
    }))
    res.json({ list })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get following error', err)
    res.status(500).json({ message: '获取关注列表失败' })
  }
})

/**
 * 粉丝列表（谁关注了该用户）
 */
usersRouter.get('/:id/followers', async (req: AuthRequest, res) => {
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.nickname, u.avatar
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC
       LIMIT 200`,
      [id]
    )
    const list = (rows as any[]).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      avatar: r.avatar ? `${baseUrl()}${r.avatar}` : null
    }))
    res.json({ list })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get followers error', err)
    res.status(500).json({ message: '获取粉丝列表失败' })
  }
})

/**
 * 某用户发布的帖子列表（用于其资料页）
 * 兼容：users 表无 avatar 列时 author_avatar 为 null
 */
usersRouter.get('/:id/posts', async (req: AuthRequest, res) => {
  const id = parseUserId(req.params.id)
  if (id == null) {
    res.status(400).json({ message: '用户 ID 不合法' })
    return
  }
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const isAdmin = Boolean(req.user?.isAdmin)
  const isSelf = req.user?.id === id

  try {
    let rows: any[]
    try {
      const [r] = await pool.query(
        `SELECT p.id, p.user_id, p.title, p.content, p.category, p.image_urls, p.created_at, p.view_count, p.like_count,
         p.is_pinned, u.nickname AS author, u.avatar AS author_avatar
         FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?
         ${isAdmin || isSelf ? '' : 'AND p.audit_status = 1'}
         ORDER BY p.created_at DESC LIMIT ?`,
        isAdmin || isSelf ? [id, limit] : [id, limit]
      )
      rows = r as any[]
    } catch {
      const [r] = await pool.query(
        `SELECT p.id, p.user_id, p.title, p.content, p.category, p.image_urls, p.created_at, p.view_count, p.like_count,
         p.is_pinned, u.nickname AS author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?
         ${isAdmin || isSelf ? '' : 'AND p.audit_status = 1'}
         ORDER BY p.created_at DESC LIMIT ?`,
        [id, limit]
      )
      rows = (r as any[]).map((p) => ({ ...p, author_avatar: null }))
    }
    const listBaseUrl = baseUrl()
    const list = rows.map((p) => ({
      ...p,
      author_avatar: p.author_avatar ? `${listBaseUrl}${p.author_avatar}` : null
    }))
    res.json({ list })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get user posts error', err)
    res.status(500).json({ message: '获取帖子列表失败' })
  }
})

/**
 * 根据用户 ID 获取昵称和头像
 */
usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = parseUserId(req.params.id)
  if (id == null) {
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
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: '未登录' })
      return
    }
    if (!req.file) {
      res.status(400).json({ message: '请选择要上传的图片' })
      return
    }
    let processedName: string
    try {
      ;({ filename: processedName } = await processUploadedImage(req.file.path, 'avatar'))
    } catch (err) {
      next(err as Error)
      return
    }
    const avatarPath = `/uploads/${processedName}`
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
  uploadImageErrorHandler
)

/**
 * 设置用户界面语言（用于管理员私信通知）
 * PUT /api/users/me/language
 * body: { lang: 'zh' | 'en' }
 */
usersRouter.put('/me/language', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const { lang } = req.body as { lang?: string }
  const normalized = lang === 'en' ? 'en' : 'zh'

  try {
    await pool.query('UPDATE users SET ui_lang = ? WHERE id = ?', [
      normalized,
      req.user.id
    ])
    res.json({ message: '语言更新成功', lang: normalized })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update language error', err)
    res.status(500).json({ message: '语言更新失败' })
  }
})
