import type { Pool } from 'mysql2/promise'
import { config } from './config'

/** mysql2 可能返回 column_name 或 COLUMN_NAME，统一读取 */
export function columnNamesFromInfoSchema(rows: unknown[]): Set<string> {
  return new Set(
    (rows as Record<string, unknown>[])
      .map((row) => {
        const name = row.column_name ?? row.COLUMN_NAME
        return name != null ? String(name).toLowerCase() : ''
      })
      .filter(Boolean)
  )
}

export async function getTableColumnSet(pool: Pool, tableName: string): Promise<Set<string>> {
  const [rows] = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [config.db.database, tableName]
  )
  return columnNamesFromInfoSchema(rows as unknown[])
}

export function toIsAdmin(value: unknown): boolean {
  return Number(value ?? 0) === 1
}
