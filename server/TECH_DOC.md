# RedBrick Backend Server - Technical Documentation

## Overview

RedBrick is a campus communication platform backend for Hong Kong Polytechnic University (PolyU).

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express 5.x |
| Language | TypeScript |
| Database | MySQL 8.x (mysql2 driver) |
| Authentication | JWT (7-day expiry) |
| Password Hashing | bcrypt |
| File Upload | Multer |
| Email | Nodemailer (optional) |

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Entry point, route mounting
│   ├── config.ts             # Environment config
│   ├── db.ts                 # MySQL connection pool + schema migrations
│   ├── email.ts              # SMTP email sending
│   ├── verificationStore.ts  # In-memory verification codes
│   ├── middleware/
│   │   └── auth.ts           # JWT validation
│   ├── routes/
│   │   ├── auth.ts           # /api/auth
│   │   ├── posts.ts          # /api/posts
│   │   ├── messages.ts       # /api/messages
│   │   ├── notifications.ts  # /api/notifications
│   │   ├── users.ts          # /api/users
│   │   ├── admin.ts          # /api/admin
│   │   └── upload.ts         # /api/upload + Multer config
│   └── scripts/
│       └── create-admin.ts   # Admin creation CLI
├── uploads/                  # Uploaded images
├── schema.sql                # Initial DB schema
└── .env                      # Environment variables
```

---

## Database Schema (ER Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RedBrick Database Schema                            │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐
  │        users         │
  ├──────────────────────┤
  │ PK  id               │
  │     email            │ UNIQUE
  │     password_hash    │
  │     nickname         │
  │     avatar           │
  │     is_admin         │ DEFAULT 0
  │     ui_lang          │ DEFAULT 'zh'
  │     created_at       │
  └──────────┬───────────┘
             │
             │ 1
             │
 ┌───────────┼───────────────────────────────┐
 │           │                               │
 │           ▼ n                             ▼ n
 │  ┌─────────────────┐           ┌─────────────────┐
 │  │      posts      │           │    messages     │
 │  ├─────────────────┤           ├─────────────────┤
 │  │ PK  id          │           │ PK  id          │
 │  │ FK  user_id     │───────────│ FK  from_user_id│──┐
 │  │     title       │           │ FK  to_user_id  │──┼──► users
 │  │     content     │           │     content     │  │
 │  │     category    │           │     is_read     │  │
 │  │     image_urls  │           │     created_at  │  │
 │  │     view_count  │           └─────────────────┘  │
 │  │     like_count  │                                │
 │  │     is_pinned   │           ┌─────────────────┐  │
 │  │     audit_status│           │     follows     │  │
 │  │     audit_reason│           ├─────────────────┤  │
 │  │     published_at│           │ PK  follower_id │──┼──► users
 │  │     created_at  │           │ PK  following_id│──┼──► users
 │  └────────┬────────┘           │     created_at  │  │
 │           │                    └─────────────────┘  │
 │           │ 1                                        │
 │           │                                          │
 │           ▼ n                                        │
 │  ┌─────────────────┐                                │
 │  │    comments     │                                │
 │  ├─────────────────┤                                │
 │  │ PK  id          │                                │
 │  │ FK  post_id     │──────► posts                   │
 │  │ FK  user_id     │──────► users                   │
 │  │ FK  parent_     │──┐    (self-referencing        │
 │  │     comment_id  │◄─┘     for replies)            │
 │  │     content     │                                │
 │  │     created_at  │                                │
 │  └─────────────────┘                                │
 │                                                     │
 │  ┌─────────────────┐                                │
 │  │      likes      │                                │
 │  ├─────────────────┤                                │
 │  │ PK  id          │                                │
 │  │ FK  post_id     │──────► posts                   │
 │  │ FK  user_id     │──────► users                   │
 │  │ UNIQUE(post_id, │                                │
 │  │        user_id) │                                │
 │  │     created_at  │                                │
 │  └─────────────────┘                                │
 │                                                     │
 └─────────────────────────────────────────────────────┘

                   ┌──────────────────────────┐
                   │ user_notification_read   │
                   ├──────────────────────────┤
                   │ PK  user_id              │──► users
                   │ PK  notification_type    │ ('like','follow','comment')
                   │     last_read_at         │
                   └──────────────────────────┘
```

---

## API Endpoints Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Architecture                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Client    │
                              └──────┬──────┘
                                     │ HTTP
                                     ▼
                        ┌────────────────────────┐
                        │   Express Server       │
                        │   localhost:4000       │
                        └───────────┬────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  Auth Middleware│   │  Static Files   │   │  Error Handler  │
    │  (JWT verify)   │   │  /uploads/*     │   │  (catch-all)    │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
              │
    ┌─────────┴─────────────────────────────────────────────────────┐
    │                                                               │
    ▼                         ▼                         ▼           ▼
┌─────────┐             ┌─────────┐             ┌─────────┐   ┌─────────┐
│ /auth   │             │ /posts  │             │ /users  │   │ /admin  │
├─────────┤             ├─────────┤             ├─────────┤   ├─────────┤
│POST/    │             │GET /    │             │GET /me/ │   │GET /    │
│ send-   │             │GET /:id │             │ profile │   │ stats   │
│ code    │             │POST /   │             │PUT /me/ │   │GET /    │
│POST/    │             │PUT /:id │             │ avatar  │   │ posts/  │
│register │             │POST/:id │             │POST/:id │   │ pending │
│POST/    │             │ /comments│            │ /follow │   │POST/:id │
│ login   │             │POST/:id │             │DELETE/  │   │ /approve│
│POST/    │             │ /like   │             │ :id/    │   │POST/:id │
│send-    │             │GET /me/ │             │ follow  │   │ /reject │
│reset-   │             │activities             │GET/:id/ │   │DELETE/  │
│ code    │             │         │             │ following│  │ posts/:id│
│POST/    │             └─────────┘             │GET/:id/ │   │POST/:id │
│reset-   │                                     │followers│   │ /pin    │
│password │                                     └─────────┘   └─────────┘
│GET /me  │
│PUT/     │             ┌─────────┐             ┌─────────┐
│nickname │             │/messages│             │/notifi- │
└─────────┘             ├─────────┤             │cations  │
                        │GET /    │             ├─────────┤
                        │convers- │             │GET /    │
                        │ations   │             │ unread- │
                        │POST /   │             │ count   │
                        │GET /    │             │GET /    │
                        │convers- │             │ likes   │
                        │ation/:id│             │GET /    │
                        │GET /    │             │ follows │
                        │unread-  │             │GET /    │
                        │count    │             │ comments│
                        └─────────┘             │POST/    │
                                                │ read    │
                                                └─────────┘
              ┌─────────┐
              │ /upload │
              ├─────────┤
              │POST/    │
              │ image   │
              └─────────┘
```

---

## Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Register   │     │    Login     │     │  API Call    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ POST /auth/  │     │ POST /auth/  │     │ Authorization│
│ send-code    │     │ login        │     │ Bearer <JWT> │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Email with   │     │ bcrypt.compare│    │ jwt.verify() │
│ 6-digit code │     │ password     │     │              │
│ (10min TTL)  │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ POST /auth/  │     │ jwt.sign()   │     │ req.user =   │
│ register     │     │ (7d expiry)  │     │ {id,email,   │
│ (verify code)│     │              │     │  nickname,   │
└──────┬───────┘     └──────┬───────┘     │  isAdmin}    │
       │                    │             └──────────────┘
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ bcrypt.hash()│     │ {token,user} │
│ INSERT user  │     │ response     │
└──────────────┘     └──────────────┘
```

---

## Image Upload Flow

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Frontend  │                    │   Backend   │                    │   Database  │
│  (RichText  │                    │  (Multer)   │                    │   (MySQL)   │
│   Editor)   │                    │             │                    │             │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  POST /api/upload/image          │                                  │
       │  Content-Type: multipart/form-data                                 │
       │  Body: FormData { file }          │                                  │
       │ ─────────────────────────────────►│                                  │
       │                                  │                                  │
       │                                  │ 1. Validate:                     │
       │                                  │    - Size ≤ 10MB                 │
       │                                  │    - Type: JPEG/PNG/GIF/WEBP     │
       │                                  │                                  │
       │                                  │ 2. Save to:                      │
       │                                  │    uploads/{timestamp}-{rand}.ext│
       │                                  │                                  │
       │  { url: "http://localhost:4000/  │                                  │
       │      uploads/1234567890-abc.jpg"}│                                  │
       │ ◄─────────────────────────────────│                                  │
       │                                  │                                  │
       │  POST /api/posts                 │                                  │
       │  { content: "<img src='...'/>" } │                                  │
       │ ─────────────────────────────────►│  INSERT INTO posts               │
       │                                  │ ─────────────────────────────────►│
       │                                  │                                  │
```

**Storage Paths:**
- Post images: `server/uploads/{timestamp}-{random}.{ext}`
- Avatar: Same location, path stored in `users.avatar` as `/uploads/filename`

---

## Post Audit Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Post Audit Workflow                                │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    System                     Admin
    │                        │                         │
    │  Create Post           │                         │
    │ ──────────────────────►│                         │
    │                        │                         │
    │         audit_status=0│                         │
    │            (pending)   │                         │
    │                        │    GET /admin/posts/    │
    │                        │    pending              │
    │                        │ ◄───────────────────────│
    │                        │                         │
    │                        │    POST /admin/posts/   │
    │                        │    :id/approve          │
    │                        │ ◄───────────────────────│
    │                        │                         │
    │                        │ audit_status=1          │
    │                        │ published_at=NOW()      │
    │                        │                         │
    │  Private message       │                         │
    │  "Your post approved"  │                         │
    │ ◄──────────────────────│                         │
    │                        │                         │


                    ┌─────────────┐
                    │   OR        │
                    └─────────────┘

    │                        │    POST /admin/posts/   │
    │                        │    :id/reject           │
    │                        │    { reason: "..." }    │
    │                        │ ◄───────────────────────│
    │                        │                         │
    │                        │ audit_status=0          │
    │                        │ audit_reason="..."      │
    │                        │                         │
    │  Private message       │                         │
    │  "Post rejected: ..."  │                         │
    │ ◄──────────────────────│                         │
    │                        │                         │
    │  Edit post             │                         │
    │  (resets to pending)   │                         │
    │ ──────────────────────►│                         │
    │                        │                         │
```

---

## Configuration

### Required Environment Variables

```bash
# Server
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=redbrick
DB_PASSWORD=your_password
DB_NAME=redbrick

# Security
JWT_SECRET=your_random_secret_string
API_BASE_URL=http://localhost:4000
```

### Optional (Email Verification)

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
MAIL_FROM=noreply@example.com
```

---

## Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start

# Create admin
npm run create-admin -- admin@polyu.edu.hk password 管理员
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt (10 rounds) |
| Authentication | JWT (7-day expiry) |
| Email Restriction | PolyU domains only |
| SQL Injection | Parameterized queries |
| File Upload | Type/size validation |
| Rate Limiting | 60s cooldown on codes |
| Authorization | Role-based (user/admin) |
