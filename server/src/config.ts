import dotenv from 'dotenv'

dotenv.config()

/**
 * 全局配置（从环境变量中读取）
 */
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'changeme-wiselearn-secret',
  jwtExpiresIn: '7d' as const,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wis elearn'
  }
}
