import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db'
import { config } from '../config'
import { AuthUser, AuthRequest, authMiddleware } from '../middleware/auth'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.hk)$/
const NICKNAME_REGEX = /^[\u4e00-\u9fa5A-Za-z0-9]{2,20}$/

export const authRouter = Router()

/**
 * 用户注册
 * body: { email, password, nickname }
 */
authRouter.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body as {
    email?: string
    password?: string
    nickname?: string
  }

  if (!email || !password || !nickname) {
    res.status(400).json({ message: '邮箱、密码和昵称均为必填' })
    return
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ message: '仅允许使用 PolyU 校园邮箱注册' })
    return
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    res.status(400).json({ message: '昵称需为 2-20 位中英文或数字，且不含特殊符号' })
    return
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if ((rows as any[]).length > 0) {
      res.status(409).json({ message: '该邮箱已注册，请直接登录' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    await pool.query(
      'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)',
      [email, hashed, nickname]
    )
    res.json({ message: '注册成功，请登录' })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Register error', err)
    res.status(500).json({ message: '注册失败，请稍后重试' })
  }
})

/**
 * 用户登录
 * body: { email, password }
 */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    res.status(400).json({ message: '邮箱和密码为必填' })
    return
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, nickname, is_admin FROM users WHERE email = ?',
      [email]
    )
    const user = (rows as any[])[0]
    if (!user) {
      res.status(401).json({ message: '邮箱或密码错误' })
      return
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      res.status(401).json({ message: '邮箱或密码错误' })
      return
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
    let avatar: string | null = null
    try {
      const [avRows] = await pool.query('SELECT avatar FROM users WHERE id = ?', [user.id])
      const av = (avRows as any[])[0]
      if (av?.avatar) avatar = `${baseUrl}${av.avatar}`
    } catch {
      // avatar 列可能不存在（未执行迁移），忽略
    }

    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      isAdmin: Boolean(user.is_admin)
    }
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    })
    res.json({
      token,
      user: {
        ...payload,
        avatar
      }
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Login error', err)
    res.status(500).json({ message: '登录失败，请稍后重试' })
  }
})

/**
 * 获取当前登录用户信息（需要携带有效 JWT）
 */
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, nickname, is_admin FROM users WHERE id = ?',
      [req.user.id]
    )
    const user = (rows as any[])[0]
    if (!user) {
      res.status(404).json({ message: '用户不存在' })
      return
    }
    let avatar: string | null = null
    try {
      const [avRows] = await pool.query('SELECT avatar FROM users WHERE id = ?', [req.user.id])
      const av = (avRows as any[])[0]
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000'
      if (av?.avatar) avatar = `${baseUrl}${av.avatar}`
    } catch {
      // avatar 列可能不存在（未执行迁移），忽略
    }
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar,
      isAdmin: Boolean(user.is_admin)
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get me error', err)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

/**
 * 更新昵称（需要携带有效 JWT）
 */
authRouter.put('/nickname', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const { nickname } = req.body as { nickname?: string }
  if (!nickname || !NICKNAME_REGEX.test(nickname)) {
    res.status(400).json({ message: '昵称需为 2-20 位中英文或数字，且不含特殊符号' })
    return
  }

  try {
    await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [
      nickname,
      req.user.id
    ])
    res.json({ message: '昵称更新成功', nickname })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update nickname error', err)
    res.status(500).json({ message: '更新昵称失败' })
  }
})

