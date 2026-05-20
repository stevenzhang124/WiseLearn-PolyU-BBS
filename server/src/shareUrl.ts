import type { Request } from 'express'
import { config } from './config'

/**
 * 分享链接对外根地址（须为微信爬虫可访问的 HTTPS 公网域名）。
 * 优先 SHARE_BASE_URL，其次 API_BASE_URL（Docker 下常为站点入口），再 FRONTEND_URL。
 */
export function resolveShareBase(req?: Request): string {
  const fromEnv =
    config.shareBaseUrl || config.apiBaseUrl || config.frontendUrl
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (req) {
    const origin = req.get('origin')
    if (origin) return origin.replace(/\/$/, '')
    const host = req.get('host')
    if (host) return `${req.protocol}://${host}`.replace(/\/$/, '')
  }
  return 'http://localhost:5173'
}

export function buildPostShareUrl(postId: number, req?: Request): string {
  return `${resolveShareBase(req)}/posts/${postId}`
}
