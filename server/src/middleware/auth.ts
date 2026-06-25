import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthUser {
  id: number
  email: string
  nickname: string
  isAdmin: boolean
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

/**
 * 解析并验证 JWT 的中间件
 * - 成功：在 req.user 中附加用户信息
 * - 失败：返回 401 未授权
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '未登录或令牌缺失' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: '登录状态已失效，请重新登录' })
  }
}

export async function rejectBlockedUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next()
    return
  }
  try {
    const { pool } = await import('../db')
    const [rows] = await pool.query('SELECT is_blocked FROM users WHERE id = ?', [req.user.id])
    const row = (rows as any[])[0]
    if (Number(row?.is_blocked ?? 0) === 1) {
      res.status(403).json({ message: '账号已被封禁' })
      return
    }
    next()
  } catch {
    next()
  }
}

/**
 * 仅管理员可访问的中间件
 */
export async function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(403).json({ message: '无访问权限（仅管理员可访问）' })
      return
    }
    const { pool } = await import('../db')
    const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id])
    const row = (rows as any[])[0]
    const isAdmin = Number(row?.is_admin ?? (req.user.isAdmin ? 1 : 0)) === 1
    if (!isAdmin) {
      res.status(403).json({ message: '无访问权限（仅管理员可访问）' })
      return
    }
    req.user.isAdmin = true
    next()
  } catch {
    if (!req.user?.isAdmin) {
      res.status(403).json({ message: '无访问权限（仅管理员可访问）' })
      return
    }
    next()
  }
}

