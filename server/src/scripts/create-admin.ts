/**
 * 创建管理员账号（仅限本地/初始化使用）
 * 用法：npx ts-node -r dotenv/config src/scripts/create-admin.ts <邮箱> <密码> <昵称>
 * 邮箱须为 @polyu.edu.hk 或 @connect.polyu.edu.hk
 */
import bcrypt from 'bcrypt'
import { pool } from '../db'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(polyu\.edu\.hk|connect\.polyu\.edu\.hk)$/

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const nickname = process.argv[4] || '管理员'

  if (!email || !password) {
    console.error('用法: npx ts-node -r dotenv/config src/scripts/create-admin.ts <邮箱> <密码> [昵称]')
    console.error('示例: npx ts-node -r dotenv/config src/scripts/create-admin.ts admin@polyu.edu.hk MyPass123 管理员')
    process.exit(1)
  }

  const normalized = email.trim().toLowerCase()
  if (!EMAIL_REGEX.test(normalized)) {
    console.error('仅支持 PolyU 邮箱：@polyu.edu.hk 或 @connect.polyu.edu.hk')
    process.exit(1)
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [normalized])
    if ((rows as any[]).length > 0) {
      await pool.query('UPDATE users SET password_hash = ?, nickname = ?, is_admin = 1 WHERE email = ?', [
        await bcrypt.hash(password, 10),
        nickname.trim(),
        normalized
      ])
      console.log('该邮箱已存在，已更新为管理员并重置密码。')
    } else {
      const hashed = await bcrypt.hash(password, 10)
      await pool.query(
        'INSERT INTO users (email, password_hash, nickname, is_admin) VALUES (?, ?, ?, 1)',
        [normalized, hashed, nickname.trim()]
      )
      console.log('管理员账号创建成功。')
    }
    console.log('请使用上述邮箱和密码在登录页登录，登录后侧栏会出现「管理后台」，点击即可进入。')
  } catch (err) {
    console.error('创建失败:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
