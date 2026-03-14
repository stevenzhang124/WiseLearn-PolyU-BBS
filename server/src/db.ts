import mysql from 'mysql2/promise'
import { config } from './config'

/**
 * 创建 MySQL 连接池，供全局复用
 */
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: 10
})

/**
 * 简单的可用性检查，启动时调用
 */
export async function testConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    // eslint-disable-next-line no-console
    console.log('MySQL connected successfully')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MySQL connection failed', err)
    throw err
  }
}

