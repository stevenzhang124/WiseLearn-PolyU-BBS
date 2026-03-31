import type { Location } from 'react-router-dom'

const AUTH_ONLY = new Set(['/login', '/register'])

/** 经登录门禁进入帖子等页时带上，详情页「返回」应去首页而非 history.back（避免回到登录或站外） */
export type WiselearnPostAuthState = { wiselearnBackToHome?: true }

/**
 * 登录/注册成功后跳转目标（来自 RequireLayout 写入的 state.from）
 */
export function getNavigateAfterAuth(loginOrRegisterLocation: { state?: unknown }): {
  to: string
  state?: WiselearnPostAuthState
} {
  const from = (loginOrRegisterLocation.state as { from?: Location } | undefined)?.from
  if (!from?.pathname) return { to: '/' }
  if (AUTH_ONLY.has(from.pathname)) return { to: '/' }
  return {
    to: `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`,
    state: { wiselearnBackToHome: true }
  }
}
