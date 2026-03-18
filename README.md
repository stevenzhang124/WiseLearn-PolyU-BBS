# WiseLearn - PolyU 校园交流平台

本项目为香港理工大学（PolyU）校园内部交流平台 **WiseLearn** 的示例实现，包括前端（React + TypeScript）和后端（Node.js + Express + MySQL）。

## 一、技术栈

- 前端：React + TypeScript + Vite + Ant Design + Tiptap 富文本 + DOMPurify
- 后端：Node.js + Express + TypeScript + MySQL（mysql2）+ Multer 图片上传
- 认证：JWT（7 天有效期）、bcrypt 密码加密
- UI：香港理工大学官方配色（理工红 #C8102E）、校园论坛/小红书风格、私信为微信/QQ 气泡聊天风格

## 二、快速启动

### 1. 准备环境

- Node.js 18+
- 本地或远程 MySQL 数据库

### 2. 初始化数据库

1. 在 MySQL 中创建数据库，例如：

   ```sql
   CREATE DATABASE wiselearn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. 执行后端目录下的 `schema.sql`：

   ```bash
   mysql -u root -p wiselearn < server/schema.sql
   ```

3. 执行迁移（按需）：`server/migrations/add-users-avatar.sql`、`add-follows-table.sql`、`add-user-notification-read.sql`（消息中心点赞/关注/评论未读用）。

4. 按需创建管理员账号（见下方「管理员登录」）。

### 3. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```bash
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=wiselearn
JWT_SECRET=请替换为随机生成的安全字符串
API_BASE_URL=http://localhost:4000
```

（`API_BASE_URL` 用于图片上传后返回的图片 URL，生产环境请改为实际后端地址。）

**注册邮箱验证（可选）**：如需向用户邮箱发送 6 位验证码，在 `.env` 中配置 SMTP：

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
MAIL_FROM=noreply@example.com
```

不配置时，验证码会打印在后端控制台，便于本地调试。

### 4. 启动后端

```bash
cd server
npm run dev
```

后端默认监听 `http://localhost:4000`。

### 5. 启动前端

```bash
cd client
npm run dev
```

浏览器访问 Vite 提示的地址（通常是 `http://localhost:5173`）。

若登录时出现「无法连接服务器」或 Network Error，请先确认**后端已启动**（`cd server && npm run dev`，默认端口 4000）。若后端运行在其他地址，可在 `client` 目录下新建 `.env` 并设置 `VITE_API_BASE_URL=http://你的后端地址:端口/api`（可参考 `client/.env.example`）。

### 6. 管理员登录与后台

1. **创建管理员账号**（在 `server` 目录下执行，邮箱须为 `@polyu.edu.hk` 或 `@connect.polyu.edu.hk`）：

   ```bash
   cd server
   npm run create-admin -- 你的邮箱@polyu.edu.hk 你的密码 管理员
   ```

   若该邮箱已存在，会将其设为管理员并重置密码。

2. **登录**：在前端登录页使用上述邮箱和密码登录。

3. **进入后台**：登录后左侧导航会出现「管理后台」，点击进入即可查看数据统计、热门帖子、帖子搜索与置顶/删除等。

## 三、功能概览

- 用户模块：注册（限制 PolyU 邮箱）、登录、昵称修改、个人发帖/评论/点赞记录
- 帖子模块：发帖（Tiptap 富文本 + 图片上传/粘贴/拖拽）、评论、浏览量、点赞、按时间/热度排序、转发链接；正文使用 DOMPurify 防 XSS
- 私信模块：会话列表（含别人发来的）、微信/QQ 风格气泡聊天、导航栏未读私信数量实时展示
- 管理后台：数据统计、热门帖子 TOP10、帖子置顶/删除、关键词搜索

## 四、安全与优化

- 使用 `bcrypt` 对密码进行哈希存储
- 使用 JWT + 中间件进行接口鉴权，限制后台接口仅管理员可用
- 所有数据库操作使用参数化查询，避免 SQL 注入
- 帖子列表使用分页（默认每页 20 条，最大 50 条），避免一次性加载大量数据

## 五、图片上传说明

- 发帖时在富文本中点击「图片」或粘贴/拖拽图片即可上传（接口 `POST /api/upload/image`，保存至 `server/uploads`，单张限 5MB，格式 JPEG/PNG/GIF/WEBP）。
- 图片通过 `http://localhost:4000/uploads/文件名` 访问，前端需能访问后端域名；生产环境请配置 `API_BASE_URL` 并保证静态目录可访问。

## 六、Docker 打包与上线

使用 Docker 可将前端、后端与 MySQL 一并打包，便于在服务器上一键启动。

### 1. 前置要求

- 已安装 [Docker](https://docs.docker.com/get-docker/) 与 [Docker Compose](https://docs.docker.com/compose/install/)（或 Docker Desktop 自带 Compose）。

### 2. 项目内已提供的文件

- `server/Dockerfile`：后端 Node 镜像（构建后运行 `node dist/index.js`）。
- `web/Dockerfile`：多阶段构建，先构建前端静态资源，再用 Nginx 提供页面并反代 `/api`、`/uploads`。
- `web/nginx.conf`：Nginx 配置（SPA 回退、API 与上传目录反向代理）。
- `docker-compose.yml`：编排 MySQL、后端 API、前端 Nginx 三个服务。

### 3. 修改生产配置（必做）

在运行前请编辑 `docker-compose.yml` 中 `api` 服务的环境变量：

- **`JWT_SECRET`**：改为随机强密钥，勿用默认值。
- **`DB_PASSWORD`** / **`MYSQL_ROOT_PASSWORD`** 等：按需修改数据库密码。
- **`API_BASE_URL`**：后端生成图片/头像链接时使用，需为**浏览器可访问的站点根地址**（不含 `/api`）。
  - 本机试运行：`http://localhost:8080`
  - 正式上线：改为你的域名，例如 `https://your-domain.com`

前端构建时已使用 `VITE_API_BASE_URL=/api`，会请求同域下的 `/api`，无需再改。

### 4. 构建与启动

在**项目根目录**执行：

```bash
docker compose build
docker compose up -d
```

- 前端页面：<http://localhost:8080>
- 后端健康检查：<http://localhost:8080/api/health>

### 5. 初始化管理员（首次部署）

数据库首次由 MySQL 容器根据 `server/schema.sql` 自动初始化。创建管理员需在 API 容器内执行：

```bash
docker compose exec api npm run create-admin -- 你的邮箱@polyu.edu.hk 你的密码 管理员
```

邮箱须为 `@polyu.edu.hk` 或 `@connect.polyu.edu.hk`。

### 6. 可选：迁移脚本与 SMTP

- 若需执行 `server/migrations/` 下迁移（如头像、关注、消息未读等），可在数据库就绪后自行导入，或挂载到 MySQL 的 `docker-entrypoint-initdb.d`。
- 邮件验证码：在 `docker-compose.yml` 的 `api` 服务中增加 SMTP 相关环境变量（`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`MAIL_FROM`），与本地开发 `.env` 一致即可。

### 7. 仅构建镜像用于部署

若要在其他机器或 CI 中只构建镜像、不启动：

```bash
docker compose build
```

将生成的 `polyu_bbs-api`、`polyu_bbs-web` 等镜像推送至镜像仓库，在目标服务器拉取后使用同一 `docker-compose.yml`（或等价编排）启动即可。上线时记得将 `API_BASE_URL` 设为该站点的公网域名。

## 七、后续扩展建议

- 帖子分类的后台管理（增删改分类）
- 用户等级、积分体系
- 替换为学校提供的正式 PolyU Logo 图片
- 允许多管理员角色（如版主）、细粒度权限控制

