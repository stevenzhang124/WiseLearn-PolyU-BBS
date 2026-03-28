import { Router } from 'express'
import { pool } from '../db'
import { AuthRequest, authMiddleware } from '../middleware/auth'

export const notificationsRouter = Router()
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'

notificationsRouter.use(authMiddleware)

/** 获取“点赞”通知：谁赞了我的帖子 */
notificationsRouter.get('/likes', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const myId = req.user.id
  const markRead = req.query.mark_read === '1'

  try {
    const [rows] = await pool.query(
      `
      SELECT
        l.id AS likeId,
        l.post_id AS postId,
        l.created_at AS createdAt,
        u.id AS actorId,
        u.nickname AS actorNickname,
        u.avatar AS actorAvatar,
        p.title AS postTitle
      FROM likes l
      JOIN posts p ON p.id = l.post_id AND p.user_id = ?
      JOIN users u ON u.id = l.user_id
      WHERE l.user_id != ?
      ORDER BY l.created_at DESC
      LIMIT 100
      `,
      [myId, myId]
    )

    let lastReadAt: Date | null = null
    const [readRows] = await pool.query(
      'SELECT last_read_at FROM user_notification_read WHERE user_id = ? AND notification_type = ?',
      [myId, 'like']
    )
    if ((readRows as any[]).length > 0) {
      lastReadAt = (readRows as any[])[0].last_read_at
    }

    const list = (rows as any[]).map((r) => ({
      likeId: r.likeId,
      postId: r.postId,
      postTitle: r.postTitle,
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        nickname: r.actorNickname,
        avatar: r.actorAvatar ? `${baseUrl}${r.actorAvatar}` : null
      }
    }))

    const unreadCount = lastReadAt
      ? list.filter((x) => new Date(x.createdAt) > new Date(lastReadAt!)).length
      : list.length

    if (markRead) {
      await pool.query(
        'INSERT INTO user_notification_read (user_id, notification_type, last_read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()',
        [myId, 'like']
      )
    }

    res.json({ list, unreadCount: markRead ? 0 : unreadCount })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get notifications likes error', err)
    res.status(500).json({ message: '获取点赞通知失败' })
  }
})

/** 获取“关注”通知：谁关注了我 */
notificationsRouter.get('/follows', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const myId = req.user.id
  const markRead = req.query.mark_read === '1'

  try {
    const [rows] = await pool.query(
      `
      SELECT
        f.follower_id AS actorId,
        f.created_at AS createdAt,
        u.nickname AS actorNickname,
        u.avatar AS actorAvatar
      FROM follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT 100
      `,
      [myId]
    )

    let lastReadAt: Date | null = null
    const [readRows] = await pool.query(
      'SELECT last_read_at FROM user_notification_read WHERE user_id = ? AND notification_type = ?',
      [myId, 'follow']
    )
    if ((readRows as any[]).length > 0) {
      lastReadAt = (readRows as any[])[0].last_read_at
    }

    const list = (rows as any[]).map((r) => ({
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        nickname: r.actorNickname,
        avatar: r.actorAvatar ? `${baseUrl}${r.actorAvatar}` : null
      }
    }))

    const unreadCount = lastReadAt
      ? list.filter((x) => new Date(x.createdAt) > new Date(lastReadAt!)).length
      : list.length

    if (markRead) {
      await pool.query(
        'INSERT INTO user_notification_read (user_id, notification_type, last_read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()',
        [myId, 'follow']
      )
    }

    res.json({ list, unreadCount: markRead ? 0 : unreadCount })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get notifications follows error', err)
    res.status(500).json({ message: '获取关注通知失败' })
  }
})

/** 获取“评论/回复”通知：谁评论或回复了我的帖子/评论 */
notificationsRouter.get('/comments', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const myId = req.user.id
  const markRead = req.query.mark_read === '1'

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.id AS commentId,
        c.post_id AS postId,
        c.content,
        c.parent_comment_id AS parentCommentId,
        c.created_at AS createdAt,
        u.id AS actorId,
        u.nickname AS actorNickname,
        u.avatar AS actorAvatar,
        p.title AS postTitle
      FROM comments c
      JOIN posts p ON p.id = c.post_id
      JOIN users u ON u.id = c.user_id
      WHERE (p.user_id = ? OR c.parent_comment_id IN (SELECT id FROM comments WHERE user_id = ?))
        AND c.user_id != ?
      ORDER BY c.created_at DESC
      LIMIT 100
      `,
      [myId, myId, myId]
    )

    let lastReadAt: Date | null = null
    const [readRows] = await pool.query(
      'SELECT last_read_at FROM user_notification_read WHERE user_id = ? AND notification_type = ?',
      [myId, 'comment']
    )
    if ((readRows as any[]).length > 0) {
      lastReadAt = (readRows as any[])[0].last_read_at
    }

    const list = (rows as any[]).map((r) => ({
      commentId: r.commentId,
      postId: r.postId,
      postTitle: r.postTitle,
      content: r.content,
      parentCommentId: r.parentCommentId,
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        nickname: r.actorNickname,
        avatar: r.actorAvatar ? `${baseUrl}${r.actorAvatar}` : null
      }
    }))

    const unreadCount = lastReadAt
      ? list.filter((x) => new Date(x.createdAt) > new Date(lastReadAt!)).length
      : list.length

    if (markRead) {
      await pool.query(
        'INSERT INTO user_notification_read (user_id, notification_type, last_read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()',
        [myId, 'comment']
      )
    }

    res.json({ list, unreadCount: markRead ? 0 : unreadCount })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get notifications comments error', err)
    res.status(500).json({ message: '获取评论通知失败' })
  }
})

/** 标记某类通知为已读 */
notificationsRouter.post('/read', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const { type } = req.body as { type?: string }
  if (!['like', 'follow', 'comment'].includes(type)) {
    res.status(400).json({ message: '无效的 type' })
    return
  }
  try {
    await pool.query(
      'INSERT INTO user_notification_read (user_id, notification_type, last_read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()',
      [req.user.id, type]
    )
    res.json({ ok: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Mark notifications read error', err)
    res.status(500).json({ message: '操作失败' })
  }
})

/** 未读数（仅点赞/关注/评论；私信由 /messages/unread-count 提供） */
notificationsRouter.get('/unread-count', async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }
  const myId = req.user.id
  try {
    const [readRows] = await pool.query(
      'SELECT notification_type, last_read_at FROM user_notification_read WHERE user_id = ?',
      [myId]
    )
    const readMap = new Map(
      (readRows as any[]).map((r) => [r.notification_type, r.last_read_at])
    )

    let likesUnread = 0
    const [likeRows] = await pool.query(
      'SELECT COUNT(*) AS c FROM likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = ? AND l.user_id != ? AND l.created_at > COALESCE((SELECT last_read_at FROM user_notification_read WHERE user_id = ? AND notification_type = ?), "1970-01-01")',
      [myId, myId, myId, 'like']
    )
    likesUnread = (likeRows as any[])[0]?.c ?? 0

    let followsUnread = 0
    const [followRows] = await pool.query(
      'SELECT COUNT(*) AS c FROM follows WHERE following_id = ? AND created_at > COALESCE((SELECT last_read_at FROM user_notification_read WHERE user_id = ? AND notification_type = ?), "1970-01-01")',
      [myId, myId, 'follow']
    )
    followsUnread = (followRows as any[])[0]?.c ?? 0

    const lastCommentRead = readMap.get('comment') || new Date(0)
    const [commentRows] = await pool.query(
      `
      SELECT COUNT(*) AS c FROM comments c
      JOIN posts p ON p.id = c.post_id
      WHERE (p.user_id = ? OR c.parent_comment_id IN (SELECT id FROM comments WHERE user_id = ?))
        AND c.user_id != ? AND c.created_at > ?
      `,
      [myId, myId, myId, lastCommentRead]
    )
    const commentsUnread = (commentRows as any[])[0]?.c ?? 0

    res.json({
      likes: likesUnread,
      follows: followsUnread,
      comments: commentsUnread
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get notifications unread count error', err)
    res.status(500).json({ message: '获取未读数失败' })
  }
})
