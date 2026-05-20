import dotenv from 'dotenv'

dotenv.config()

/**
 * 全局配置（从环境变量中读取）
 */
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'changeme-redbrick-secret',
  /** 字面量类型，满足 jsonwebtoken SignOptions.expiresIn */
  jwtExpiresIn: '7d' as const,
  /** 图片/头像等静态资源对外 URL 前缀（不含 /api） */
  apiBaseUrl: (process.env.API_BASE_URL || '').replace(/\/$/, ''),
  /** 前端 SPA 地址，用于分享页「查看完整内容」跳转 */
  frontendUrl: (process.env.FRONTEND_URL || '').replace(/\/$/, ''),
  /**
   * 分享卡片链接根地址（如 https://your-domain.com）。
   * 未设置时回退 API_BASE_URL / FRONTEND_URL。
   */
  shareBaseUrl: (process.env.SHARE_BASE_URL || '').replace(/\/$/, ''),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wiselearn'
  }
}
