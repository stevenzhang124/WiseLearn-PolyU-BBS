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

/**
 * 仅管理员可访问的中间件
 */
export function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: '无访问权限（仅管理员可访问）' })
    return
  }
  next()
}

