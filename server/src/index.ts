import express from 'express'
import cors from 'cors'
import path from 'path'
import { json, urlencoded } from 'express'
import { config } from './config'
import {
  ensurePostsAuditColumns,
  ensurePostsPublishedAtColumn,
  ensureUserNotificationReadTable,
  ensureUsersUiLangColumn,
  testConnection
} from './db'
import { authRouter } from './routes/auth'
import { postRouter } from './routes/posts'
import { messageRouter } from './routes/messages'
import { adminRouter } from './routes/admin'
import { usersRouter } from './routes/users'
import { uploadRouter } from './routes/upload'
import { notificationsRouter } from './routes/notifications'

const app = express()

// 全局中间件
app.use(
  cors({
    origin: true,
    credentials: true
  })
)
app.use(json())
app.use(urlencoded({ extended: true }))

// 上传文件静态访问（图片 URL 指向此处）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// 基础健康检查接口
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RedBrick API' })
})

// 功能路由
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/posts', postRouter)
app.use('/api/messages', messageRouter)
app.use('/api/admin', adminRouter)
app.use('/api/users', usersRouter)
app.use('/api/notifications', notificationsRouter)

// 全局错误处理
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err)
    res.status(500).json({ message: '服务器内部错误，请稍后重试' })
  }
)

async function bootstrap(): Promise<void> {
  try {
    await testConnection()
    await ensurePostsAuditColumns()
    await ensurePostsPublishedAtColumn()
    await ensureUsersUiLangColumn()
    await ensureUserNotificationReadTable()
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`RedBrick API listening on port ${config.port}`)
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Server startup failed:', err)
    process.exit(1)
  }
}

bootstrap()

