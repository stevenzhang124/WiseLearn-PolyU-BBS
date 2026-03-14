# WiseLearn - PolyU 校园交流平台

本项目为香港理工大学（PolyU）校园内部交流平台 **WiseLearn** 的示例实现，包括前端（React + TypeScript）和后端（Node.js + Express + MySQL）。

## 一、技术栈

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Node.js + Express + TypeScript + MySQL（mysql2）
- 认证：JWT（7 天有效期）、bcrypt 密码加密

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

3. 按需手动创建管理员账号（见 `schema.sql` 文件注释）。

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
```

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

## 三、功能概览

- 用户模块：注册（限制 PolyU 邮箱）、登录、昵称修改、个人发帖/评论/点赞记录
- 帖子模块：发帖（富文本 + 图片 URL）、评论与二级回复、浏览量统计、点赞/取消点赞、按时间/热度排序、转发链接生成
- 私信模块：一对一私信、会话记录、未读消息数量提醒
- 管理后台：数据统计（用户/帖子/新增）、热门帖子 TOP10、帖子置顶/取消置顶、删除帖子、关键词搜索

## 四、安全与优化

- 使用 `bcrypt` 对密码进行哈希存储
- 使用 JWT + 中间件进行接口鉴权，限制后台接口仅管理员可用
- 所有数据库操作使用参数化查询，避免 SQL 注入
- 帖子列表使用分页（默认每页 20 条，最大 50 条），避免一次性加载大量数据

## 五、后续扩展建议

- 帖子分类的后台管理（增删改分类）
- 用户等级、积分体系
- 富文本编辑器中增加附件上传、更多格式支持
- 允许多管理员角色（如版主）、细粒度权限控制

