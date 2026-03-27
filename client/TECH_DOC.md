# RedBrick Frontend - Technical Documentation

## Overview

RedBrick frontend is a single-page application (SPA) built with React and TypeScript, featuring a Xiaohongshu (Little Red Book) style UI with PolyU branding.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite 8 |
| UI Library | Ant Design 6 |
| Routing | React Router 7 |
| State Management | React Context + TanStack Query |
| Rich Text Editor | Tiptap |
| HTTP Client | Axios |
| i18n | react-i18next |
| XSS Prevention | DOMPurify |

## Project Structure

```
client/
├── src/
│   ├── main.tsx           # Entry point, routes, theme
│   ├── i18n.ts            # i18n configuration
│   ├── style.css          # Global styles
│   ├── locales/
│   │   ├── zh.json        # Chinese translations
│   │   └── en.json        # English translations
│   └── modules/
│       ├── auth/
│       │   ├── AuthContext.tsx   # Auth state management
│       │   ├── LoginPage.tsx     # Login form
│       │   └── RegisterPage.tsx  # Registration form
│       ├── layout/
│       │   ├── LayoutShell.tsx   # Main layout (header, sidebar, bottom nav)
│       │   └── PolyULogo.tsx     # SVG logo component
│       ├── home/
│       │   └── HomePage.tsx      # Post feed (card grid)
│       ├── posts/
│       │   ├── CreatePostPage.tsx    # Create post
│       │   ├── EditPostPage.tsx      # Edit post
│       │   ├── PostDetailPage.tsx    # Post detail + comments
│       │   ├── RichTextEditor.tsx    # Tiptap editor
│       │   └── generateTitleCover.ts # Cover image generator
│       ├── messages/
│       │   └── MessagesPage.tsx   # Notification center + DM chat
│       ├── profile/
│       │   ├── ProfilePage.tsx        # User profile + settings
│       │   └── ProfileFollowListPage.tsx  # Following/Followers list
│       ├── user/
│       │   └── UserProfilePage.tsx    # Other user's profile
│       ├── admin/
│       │   └── AdminDashboardPage.tsx # Admin panel
│       └── shared/
│           ├── api.ts     # API client + all API functions
│           └── Avatar.tsx # Avatar component
├── public/
│   ├── polyu-logo.png     # PolyU full logo
│   └── polyu-knot.png     # PolyU icon (mobile)
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Architecture                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Browser   │
                              └──────┬──────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │     main.tsx           │
                        │  - ConfigProvider      │
                        │  - AuthProvider        │
                        │  - BrowserRouter       │
                        │  - i18n                │
                        └───────────┬────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
              ▼                                           ▼
    ┌─────────────────┐                         ┌─────────────────┐
    │  Public Routes  │                         │ Protected Routes│
    │  (no auth)      │                         │ (RequireLayout) │
    ├─────────────────┤                         ├─────────────────┤
    │ /login          │                         │ /               │
    │ /register       │                         │ /create         │
    │                 │                         │ /posts/:id      │
    │                 │                         │ /posts/:id/edit │
    │                 │                         │ /messages       │
    │                 │                         │ /profile        │
    │                 │                         │ /admin (admin)  │
    └─────────────────┘                         └────────┬────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────┐
                                                │  LayoutShell    │
                                                │  ┌───────────┐  │
                                                │  │  Header   │  │
                                                │  ├───────────┤  │
                                                │  │ Sider │   │  │
                                                │  │       │ C │  │
                                                │  │ Menu  │ o │  │
                                                │  │       │ n │  │
                                                │  │       │ t │  │
                                                │  │       │ e │  │
                                                │  │       │ n │  │
                                                │  │       │ t │  │
                                                │  └───────────┘  │
                                                │  ┌───────────┐  │
                                                │  │ BottomNav │  │
                                                │  └───────────┘  │
                                                └─────────────────┘
```

---

## Routing Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Route Configuration                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  Path                    Component              Auth      Description
  ────────────────────────────────────────────────────────────────────────────────
  /login                  LoginPage              Public    Login form
  /register               RegisterPage           Public    Registration form

  /                       LayoutShell            Required  Main layout wrapper
    ├─ index              HomePage                         Post feed (card grid)
    ├─ create             CreatePostPage                   Create new post
    ├─ posts/:id          PostDetailPage                   Post detail + comments
    ├─ posts/:id/edit     EditPostPage                     Edit own post
    ├─ users/:id          UserProfilePage                  Other user's profile
    ├─ profile            ProfilePage                      Own profile + settings
    ├─ profile/following  ProfileFollowListPage            Following list
    ├─ profile/followers  ProfileFollowListPage            Followers list
    ├─ messages           MessagesPage                     Notification center
    ├─ messages/:userId   MessagesPage                     DM chat with user
    └─ admin              AdminDashboardPage     Admin     Admin dashboard
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Authentication Flow                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
  │  Login Page  │                    │ AuthContext  │                    │    API       │
  └──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
         │                                   │                                   │
         │  login(email, password, remember) │                                   │
         │ ─────────────────────────────────►│                                   │
         │                                   │                                   │
         │                                   │  POST /api/auth/login             │
         │                                   │ ─────────────────────────────────►│
         │                                   │                                   │
         │                                   │  { token, user }                  │
         │                                   │ ◄───────────────────────────────── │
         │                                   │                                   │
         │                                   │  setToken(token)                  │
         │                                   │  setApiToken(token)               │
         │                                   │  if(remember) localStorage        │
         │                                   │                                   │
         │  navigate('/')                   │                                   │
         │ ◄─────────────────────────────────│                                   │
         │                                   │                                   │


  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Token Storage:                                                              │
  │  ┌─────────────────────────────────────────────────────────────────────────┐│
  │  │  Remember Me = true    →  localStorage('wiselearn_token')               ││
  │  │  Remember Me = false   →  Memory only (session)                         ││
  │  └─────────────────────────────────────────────────────────────────────────┘│
  └──────────────────────────────────────────────────────────────────────────────┘


  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Route Protection:                                                           │
  │                                                                              │
  │  RequireLayout:                                                              │
  │    if (!user) → Navigate to /login                                          │
  │                                                                              │
  │  AdminRoute:                                                                 │
  │    if (!user) → Navigate to /login                                          │
  │    if (!user.isAdmin) → Navigate to /                                       │
  └──────────────────────────────────────────────────────────────────────────────┘
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              State Architecture                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          AuthContext (Global)                                │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  State:                                                              │   │
  │  │    user: AuthUser | null    // { id, email, nickname, avatar, isAdmin }
  │  │    token: string | null     // JWT token                            │   │
  │  │                                                                      │   │
  │  │  Methods:                                                            │   │
  │  │    login(email, password, remember) → Promise<void>                 │   │
  │  │    logout() → void                                                  │   │
  │  │    refreshMe() → Promise<void>   // Re-fetch user info              │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          Local Component State                               │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Each page manages its own:                                          │   │
  │  │    - Loading states                                                   │   │
  │  │    - Form data                                                        │   │
  │  │    - API response data                                                │   │
  │  │    - UI state (modals, tabs, etc.)                                   │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          Custom Events (Cross-component)                     │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  wiselearn:unread-changed      →  Trigger unread badge refresh      │   │
  │  │  wiselearn:admin-pending-changed →  Trigger admin badge refresh     │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              UI Component Tree                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

  LayoutShell
  ├── Header
  │   ├── PolyU Logo (img)
  │   ├── Title + Subtitle
  │   ├── Language Switch (中/EN)
  │   ├── Avatar + Username
  │   └── Logout Button
  │
  ├── Sider (Desktop)
  │   └── Menu (Ant Design)
  │       ├── Home
  │       ├── Create Post
  │       ├── Messages (with badge)
  │       ├── Profile
  │       └── Admin (if isAdmin)
  │
  ├── Content (Outlet)
  │   │
  │   ├── HomePage
  │   │   ├── Tabs (Latest / Hot)
  │   │   └── Post Card Grid
  │   │       └── PostCard
  │   │           ├── Cover Image
  │   │           ├── Title
  │   │           ├── Author Avatar + Name
  │   │           ├── Stats (Likes / Views)
  │   │           └── Category Tag
  │   │
  │   ├── PostDetailPage
  │   │   ├── Article
  │   │   │   ├── Title
  │   │   │   ├── Author Row (Avatar, Name, Date)
  │   │   │   ├── Cover Image
  │   │   │   ├── Content (DOMPurify sanitized)
  │   │   │   └── Actions (Like, Share, Comment count)
  │   │   └── Comments Section
  │   │       ├── Comment Form
  │   │       └── Comment Tree (with replies)
  │   │
  │   ├── CreatePostPage / EditPostPage
  │   │   ├── Title Input
  │   │   ├── Category Select
  │   │   └── RichTextEditor
  │   │       ├── Toolbar (Bold, Italic, List, Image)
  │   │       └── EditorContent (Tiptap)
  │   │
  │   ├── MessagesPage
  │   │   ├── Tabs
  │   │   │   ├── Likes (Badge count)
  │   │   │   ├── Follows (Badge count)
  │   │   │   ├── Comments (Badge count)
  │   │   │   └── DM (Badge count)
  │   │   └── DM Chat View
  │   │       ├── Chat Header
  │   │       ├── Message Bubbles (WeChat style)
  │   │       └── Input Area
  │   │
  │   ├── ProfilePage
  │   │   ├── Avatar Upload
  │   │   ├── Stats (Following, Followers, Likes)
  │   │   ├── Info (Email, Role)
  │   │   ├── Nickname Form
  │   │   └── Activity Tabs (Posts, Comments, Likes)
  │   │
  │   └── AdminDashboardPage
  │       ├── Stats Cards (Users, Posts)
  │       ├── Daily New Users Chart
  │       ├── Hot Posts Top 10
  │       ├── Post Search Table
  │       └── Pending Posts Table (Approve/Reject)
  │
  └── BottomNav (Mobile)
      ├── Home
      ├── Create (Plus button)
      ├── Messages (with badge)
      └── Profile
```

---

## API Client Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API Client (api.ts)                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Axios Instance Configuration                                                │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  baseURL: VITE_API_BASE_URL || 'http://localhost:4000/api'          │   │
  │  │  timeout: 10000ms                                                    │   │
  │  │                                                                      │   │
  │  │  Request Interceptor:                                                │   │
  │  │    - Add Authorization: Bearer <token> from localStorage/memory     │   │
  │  │                                                                      │   │
  │  │  Response Interceptor:                                               │   │
  │  │    - Handle network errors → "网络连接失败"                          │   │
  │  │    - Extract error message from response                             │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  API Functions by Module                                                     │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Auth:                                                                │   │
  │  │    loginApi(email, password) → { token, user }                       │   │
  │  │    registerApi(email, password, nickname, code)                      │   │
  │  │    sendVerificationCodeApi(email)                                    │   │
  │  │    sendResetCodeApi(email)                                           │   │
  │  │    resetPasswordApi(email, code, password)                           │   │
  │  │    getMeApi() → AuthUser                                             │   │
  │  │    updateNicknameApi(nickname)                                       │   │
  │  │                                                                      │   │
  │  │  Posts:                                                               │   │
  │  │    fetchPosts(page, pageSize, sort) → { list, pagination }          │   │
  │  │    fetchPostDetail(id) → { post, comments }                          │   │
  │  │    createPost(title, content, category, imageUrls)                   │   │
  │  │    updatePost(id, ...)                                               │   │
  │  │    sendComment(postId, content, parentCommentId)                     │   │
  │  │    deleteComment(commentId)                                          │   │
  │  │    toggleLike(postId) → { liked }                                    │   │
  │  │    getShareLink(postId) → { link }                                   │   │
  │  │    getActivities() → { posts, comments, likes }                      │   │
  │  │                                                                      │   │
  │  │  Messages:                                                            │   │
  │  │    fetchConversationsList() → { conversations }                      │   │
  │  │    fetchConversation(userId) → { messages }                          │   │
  │  │    sendMessage(toUserId, content)                                    │   │
  │  │    getUnreadCount() → { count }                                      │   │
  │  │                                                                      │   │
  │  │  Notifications:                                                       │   │
  │  │    getNotificationsUnreadCount() → { likes, follows, comments }      │   │
  │  │    getNotificationsLikes(mark_read) → { list, unreadCount }          │   │
  │  │    getNotificationsFollows(mark_read) → { list, unreadCount }        │   │
  │  │    getNotificationsComments(mark_read) → { list, unreadCount }       │   │
  │  │    markNotificationsRead(type)                                       │   │
  │  │                                                                      │   │
  │  │  Users:                                                               │   │
  │  │    getMyProfileApi() → { stats }                                     │   │
  │  │    getUserProfileApi(id) → { profile }                               │   │
  │  │    getUserApi(id) → { nickname, avatar }                             │   │
  │  │    followUserApi(id) / unfollowUserApi(id)                           │   │
  │  │    getFollowingListApi(userId) / getFollowersListApi(userId)         │   │
  │  │    getUserPostsApi(userId) → { list }                                │   │
  │  │    uploadAvatarApi(file) → { avatar }                                │   │
  │  │    updateUserLanguageApi(lang)                                       │   │
  │  │                                                                      │   │
  │  │  Admin:                                                               │   │
  │  │    fetchAdminStats() → { totalUsers, totalPosts, ... }               │   │
  │  │    searchAdminPosts(keyword) → { list }                              │   │
  │  │    pinPost(id, pinned)                                               │   │
  │  │    deletePostAdmin(id)                                               │   │
  │  │    fetchAdminPendingPosts() → { list }                               │   │
  │  │    approvePostAdmin(id)                                              │   │
  │  │    rejectPostAdmin(id, reason)                                       │   │
  │  │                                                                      │   │
  │  │  Upload:                                                              │   │
  │  │    uploadImageApi(file) → { url }                                    │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Rich Text Editor (Tiptap)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RichTextEditor Component                            │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Features                                                                    │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Toolbar:                                                             │   │
  │  │    - Bold (B)                                                         │   │
  │  │    - Italic (I)                                                       │   │
  │  │    - Bullet List                                                      │   │
  │  │    - Ordered List                                                     │   │
  │  │    - Image Upload                                                     │   │
  │  │                                                                      │   │
  │  │  Image Upload Methods:                                                │   │
  │  │    1. Click "图片" button → File picker                              │   │
  │  │    2. Drag & drop image into editor                                  │   │
  │  │    3. Paste image from clipboard                                     │   │
  │  │                                                                      │   │
  │  │  Constraints:                                                         │   │
  │  │    - Max image size: 10MB                                            │   │
  │  │    - Allowed types: JPEG, PNG, GIF, WEBP                             │   │
  │  │    - No base64 (uploads to server immediately)                       │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Flow                                                                        │
  │                                                                              │
  │  User Action          Editor           API              Server              │
  │       │                 │               │                  │                │
  │       │  Drop/Paste     │               │                  │                │
  │       │ ───────────────►│               │                  │                │
  │       │                 │  uploadImageApi(file)            │                │
  │       │                 │ ─────────────►│  POST /upload    │                │
  │       │                 │               │ ────────────────►│                │
  │       │                 │               │  { url }         │                │
  │       │                 │ ◄─────────────│ ◄────────────────│                │
  │       │                 │  Insert <img src="url">          │                │
  │       │                 │  into document                    │                │
  │       │                 │                                   │                │
  │       │  onChange(html) │                                   │                │
  │       │ ◄───────────────│                                   │                │
  │       │                 │                                   │                │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## i18n (Internationalization)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              i18n Configuration                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Setup (i18n.ts)                                                            │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Default language: localStorage('wiselearn_lang') || 'zh'           │   │
  │  │  Fallback: 'zh'                                                      │   │
  │  │  Resources:                                                          │   │
  │  │    zh: { translation: require('./locales/zh.json') }                │   │
  │  │    en: { translation: require('./locales/en.json') }                │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Usage                                                                       │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  const { t, i18n } = useTranslation()                                │   │
  │  │                                                                      │   │
  │  │  // Translation                                                      │   │
  │  │  <h1>{t('home.discover')}</h1>                                       │   │
  │  │                                                                      │   │
  │  │  // With variables                                                   │   │
  │  │  {t('nav.welcome', { name: user.nickname })}                         │   │
  │  │                                                                      │   │
  │  │  // Change language                                                  │   │
  │  │  i18n.changeLanguage('en')                                           │   │
  │  │  localStorage.setItem('wiselearn_lang', 'en')                        │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Translation Keys Structure                                                  │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  {                                                                    │   │
  │  │    "nav": { "home": "首页", "create": "发帖", ... },                 │   │
  │  │    "auth": { "login": "登录", "register": "注册", ... },             │   │
  │  │    "home": { "discover": "发现", "latest": "最新", ... },            │   │
  │  │    "post": { "create": "发帖", "comments": "评论", ... },            │   │
  │  │    "messages": { ... },                                              │   │
  │  │    "notifications": { ... },                                         │   │
  │  │    "profile": { ... },                                               │   │
  │  │    "admin": { ... }                                                  │   │
  │  │  }                                                                    │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Responsive Breakpoints                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Desktop (≥ 992px)                     Mobile (< 992px)                      │
  │  ┌─────────────────────────────┐       ┌─────────────────────────────┐      │
  │  │  ┌─────────────────────┐   │       │  ┌─────────────────────┐   │      │
  │  │  │      Header         │   │       │  │  Header (hamburger) │   │      │
  │  │  ├──────┬──────────────┤   │       │  ├─────────────────────┤   │      │
  │  │  │      │              │   │       │  │                     │   │      │
  │  │  │ Side │   Content    │   │       │  │      Content        │   │      │
  │  │  │ Menu │              │   │       │  │                     │   │      │
  │  │  │      │              │   │       │  │                     │   │      │
  │  │  │      │              │   │       │  ├─────────────────────┤   │      │
  │  │  │      │              │   │       │  │    Bottom Nav Bar   │   │      │
  │  │  └──────┴──────────────┘   │       │  └─────────────────────┘   │      │
  │  └─────────────────────────────┘       └─────────────────────────────┘      │
  │                                                                              │
  │  Features:                             Features:                             │
  │  - Left sidebar visible                - Hamburger menu (drawer)             │
  │  - No bottom nav                       - Bottom navigation bar               │
  │  - Full logo in header                 - Compact logo (knot icon)            │
  │  - Language switch full text           - Language switch abbreviated         │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Theme Configuration

```typescript
// PolyU Brand Colors (main.tsx)
const POLYU_RED = '#C8102E'

const PolyUTheme = {
  token: {
    colorPrimary: POLYU_RED,       // Primary color
    colorLink: POLYU_RED,          // Link color
    colorInfo: POLYU_RED,          // Info color
    borderRadius: 12,              // Rounded corners
    fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", ...'
  },
  components: {
    Layout: {
      headerBg: '#fff',
      siderBg: '#fff'
    },
    Button: {
      colorPrimaryHover: '#a00d24'  // Darker red on hover
    },
    Menu: {
      itemSelectedBg: POLYU_RED,
      itemSelectedColor: '#fff',
      itemHoverBg: 'rgba(200, 16, 46, 0.08)'
    },
    Card: {
      borderRadiusLG: 16
    }
  }
}
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| XSS Prevention | DOMPurify.sanitize() on all HTML content |
| Token Storage | Memory + optional localStorage |
| Auth Header | Bearer token on all API requests |
| Route Protection | RequireLayout + AdminRoute guards |
| Image Validation | Type + size check before upload |

---

## Running the Frontend

```bash
# Development
npm run dev          # http://localhost:5173

# Build for production
npm run build        # Output to dist/

# Preview production build
npm run preview
```

### Environment Variables

Create `client/.env`:
```bash
VITE_API_BASE_URL=http://localhost:4000/api
```
