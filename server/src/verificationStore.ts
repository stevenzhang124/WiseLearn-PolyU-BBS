/**
 * 内存存储：邮箱 -> 验证码及过期时间（仅用于注册验证）
 * 生产环境可改为 Redis
 */
const store = new Map<
  string,
  { code: string; expiresAt: number; lastSentAt?: number }
>()

const CODE_TTL_MS = 10 * 60 * 1000 // 10 分钟有效
const SEND_COOLDOWN_MS = 60 * 1000 // 同一邮箱 60 秒内只能发一次

export function setCode(email: string, code: string): void {
  const normalized = String(email).toLowerCase().trim()
  store.set(normalized, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    lastSentAt: Date.now()
  })
}

export function getCode(email: string): { code: string; expiresAt: number } | null {
  const normalized = String(email).toLowerCase().trim()
  const entry = store.get(normalized)
  if (!entry || Date.now() > entry.expiresAt) return null
  return { code: entry.code, expiresAt: entry.expiresAt }
}

export function verifyAndConsumeCode(email: string, code: string): boolean {
  const normalized = String(email).toLowerCase().trim()
  const entry = store.get(normalized)
  if (!entry || Date.now() > entry.expiresAt) return false
  if (entry.code !== String(code).trim()) return false
  store.delete(normalized)
  return true
}

export function canSendAgain(email: string): boolean {
  const normalized = String(email).toLowerCase().trim()
  const entry = store.get(normalized)
  if (!entry?.lastSentAt) return true
  return Date.now() - entry.lastSentAt >= SEND_COOLDOWN_MS
}

export function getCooldownSeconds(email: string): number {
  const normalized = String(email).toLowerCase().trim()
  const entry = store.get(normalized)
  if (!entry?.lastSentAt) return 0
  const elapsed = Date.now() - entry.lastSentAt
  if (elapsed >= SEND_COOLDOWN_MS) return 0
  return Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000)
}
