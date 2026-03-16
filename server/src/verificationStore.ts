/**
 * 内存存储：邮箱 -> 验证码及过期时间（注册与找回密码分开 key，避免互串）
 * 生产环境可改为 Redis
 */
const store = new Map<
  string,
  { code: string; expiresAt: number; lastSentAt?: number }
>()

const CODE_TTL_MS = 10 * 60 * 1000 // 10 分钟有效
const SEND_COOLDOWN_MS = 60 * 1000 // 同一邮箱 60 秒内只能发一次

function key(email: string, purpose: 'register' | 'reset'): string {
  const normalized = String(email).toLowerCase().trim()
  return purpose === 'reset' ? `reset:${normalized}` : normalized
}

export function setCode(email: string, code: string): void {
  const k = key(email, 'register')
  store.set(k, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    lastSentAt: Date.now()
  })
}

/** 找回密码：设置验证码（与注册验证码隔离） */
export function setResetCode(email: string, code: string): void {
  const k = key(email, 'reset')
  store.set(k, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    lastSentAt: Date.now()
  })
}

export function getCode(email: string): { code: string; expiresAt: number } | null {
  const k = key(email, 'register')
  const entry = store.get(k)
  if (!entry || Date.now() > entry.expiresAt) return null
  return { code: entry.code, expiresAt: entry.expiresAt }
}

export function verifyAndConsumeCode(email: string, code: string): boolean {
  const k = key(email, 'register')
  const entry = store.get(k)
  if (!entry || Date.now() > entry.expiresAt) return false
  if (entry.code !== String(code).trim()) return false
  store.delete(k)
  return true
}

/** 找回密码：验证并消耗验证码 */
export function verifyAndConsumeResetCode(email: string, code: string): boolean {
  const k = key(email, 'reset')
  const entry = store.get(k)
  if (!entry || Date.now() > entry.expiresAt) return false
  if (entry.code !== String(code).trim()) return false
  store.delete(k)
  return true
}

export function canSendAgain(email: string): boolean {
  const k = key(email, 'register')
  const entry = store.get(k)
  if (!entry?.lastSentAt) return true
  return Date.now() - entry.lastSentAt >= SEND_COOLDOWN_MS
}

export function getCooldownSeconds(email: string): number {
  const k = key(email, 'register')
  const entry = store.get(k)
  if (!entry?.lastSentAt) return 0
  const elapsed = Date.now() - entry.lastSentAt
  if (elapsed >= SEND_COOLDOWN_MS) return 0
  return Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000)
}

/** 找回密码：是否可再次发送 */
export function canSendResetAgain(email: string): boolean {
  const k = key(email, 'reset')
  const entry = store.get(k)
  if (!entry?.lastSentAt) return true
  return Date.now() - entry.lastSentAt >= SEND_COOLDOWN_MS
}

/** 找回密码：距离可再次发送的秒数 */
export function getResetCooldownSeconds(email: string): number {
  const k = key(email, 'reset')
  const entry = store.get(k)
  if (!entry?.lastSentAt) return 0
  const elapsed = Date.now() - entry.lastSentAt
  if (elapsed >= SEND_COOLDOWN_MS) return 0
  return Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000)
}
