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

/**
 * 后台审核功能：确保 posts 表存在审核字段。
 * - audit_status: 1=已通过，0=待审核/未通过
 * - audit_reason: 驳回意见（通过时清空）
 *
 * 为了避免引入额外迁移工具，这里在服务启动时做“缺失则补列”。
 * 若列已存在（如手动执行过 schema或之前已补列），忽略 ER_DUP_FIELDNAME。
 */
export async function ensurePostsAuditColumns(): Promise<void> {
  const dbName = config.db.database

  const [rows] = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = 'posts'
  `,
    [dbName]
  )
  const colSet = new Set(
    (rows as any[]).map((r: { column_name: string }) => String(r.column_name).toLowerCase())
  )

  const toRun: { sql: string }[] = []
  if (!colSet.has('audit_status')) {
    toRun.push({ sql: 'ALTER TABLE posts ADD COLUMN audit_status TINYINT(1) NOT NULL DEFAULT 1' })
  }
  if (!colSet.has('audit_reason')) {
    toRun.push({ sql: 'ALTER TABLE posts ADD COLUMN audit_reason TEXT NULL' })
  }

  for (const { sql } of toRun) {
    try {
      await pool.query(sql)
    } catch (err: any) {
      if (err?.code === 'ER_DUP_FIELDNAME' || err?.errno === 1060) {
        // 列已存在（可能由 schema 或上次启动已添加），忽略
        continue
      }
      throw err
    }
  }
}

/**
 * 后台私信语言通知：保存用户界面语言（zh/en）
 */
export async function ensureUsersUiLangColumn(): Promise<void> {
  const dbName = config.db.database
  const [rows] = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = 'users'
  `,
    [dbName]
  )

  const colSet = new Set(
    (rows as any[]).map((r: { column_name: string }) => String(r.column_name).toLowerCase())
  )

  if (!colSet.has('ui_lang')) {
    try {
      await pool.query(
        "ALTER TABLE users ADD COLUMN ui_lang VARCHAR(8) NOT NULL DEFAULT 'zh'"
      )
    } catch (err: any) {
      if (err?.code === 'ER_DUP_FIELDNAME' || err?.errno === 1060) return
      throw err
    }
  }
}

