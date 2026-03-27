# RedBrick Frontend - Technical Documentation

## Overview

RedBrick frontend is a single-page application (SPA) built with React and TypeScript, featuring a Xiaohongshu (Little Red Book) style UI with PolyU branding.

## Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | React 18 | |
| Language | TypeScript | |
| Build Tool | Vite 8 | |
| UI Library | Ant Design 6 | PolyU theme (#C8102E) |
| Routing | React Router 7 | |
| State Management | React Context | Auth + local component state |
| Rich Text Editor | BlockNote | Notion-style block editor |
| HTTP Client | Axios | |
| i18n | react-i18next | zh/en |
| XSS Prevention | DOMPurify | |

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

  LayoutShell (Weibo-style 3-column layout)
  ├── Header
  │   ├── PolyU Logo (img)
  │   ├── Title + Subtitle
  │   ├── Language Switch (中/EN)
  │   ├── Avatar + Username
  │   └── Logout Button
  │
  ├── Layout (3 columns: LeftNav | MainContent | RightBar)
  │   │
  │   ├── LeftNav (240px, extracted component)
  │   │   └── Menu (Ant Design)
  │   │       ├── Home
  │   │       ├── Create Post
  │   │       ├── Messages (with badge)
  │   │       ├── Profile
  │   │       └── Admin (if isAdmin)
  │   │
  │   ├── MainContent (flexible width)
  │   │   │
  │   │   ├── HomePage
  │   │   │   ├── FeedTabs (All, Campus Life, Class Q&A, Career, etc.)
  │   │   │   └── FeedList
  │   │   │       └── FeedPostItem (Weibo-style horizontal card)
  │   │   │           ├── Author Row (Avatar, Name, Date)
  │   │   │           ├── Title
  │   │   │           ├── Content Preview
  │   │   │           ├── Image Gallery (grid)
  │   │   │           └── Action Bar (Like, Comment, Share, Views, Category)
  │   │   │
  │   │   ├── PostDetailPage
  │   │   │   ├── Article
  │   │   │   │   ├── Title
  │   │   │   │   ├── Author Row (Avatar, Name, Date)
  │   │   │   │   ├── Content (DOMPurify sanitized)
  │   │   │   │   └── Actions (Like, Share, Comment count)
  │   │   │   └── Comments Section
  │   │   │       ├── Comment Form
  │   │   │       └── Comment Tree (with replies)
  │   │   │
  │   │   ├── CreatePostPage / EditPostPage
  │   │   │   ├── Title Input
  │   │   │   ├── Category Select
  │   │   │   └── RichTextEditor (BlockNote)
  │   │   │
  │   │   ├── MessagesPage
  │   │   │   ├── Tabs
  │   │   │   │   ├── Likes (Badge count)
  │   │   │   │   ├── Follows (Badge count)
  │   │   │   │   ├── Comments (Badge count)
  │   │   │   │   └── DM (Badge count)
  │   │   │   └── DM Chat View
  │   │   │
  │   │   ├── ProfilePage
  │   │   │   ├── Avatar Upload
  │   │   │   ├── Stats (Following, Followers, Likes)
  │   │   │   └── Activity Tabs (Posts, Comments, Likes)
  │   │   │
  │   │   └── AdminDashboardPage
  │   │
  │   └── RightBar (280px, only visible on home page)
  │       └── Sidebar Modules
  │           ├── Trending Topics (tabbed: Hot/Latest)
  │           └── Active Users (tabbed: Posters/Likers)
  │
  └── BottomNav (Mobile only, <992px)
      ├── Home
      ├── Create (Plus button)
      ├── Messages (with badge)
      ├── Profile
      └── Admin (if isAdmin)
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

## Rich Text Editor (BlockNote)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RichTextEditor Component                            │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Dependencies                                                                │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  npm install @blocknote/core @blocknote/react @blocknote/mantine    │   │
  │  │                                                                      │   │
  │  │  @blocknote/core     - Core editor logic                            │   │
  │  │  @blocknote/react    - React hooks (useCreateBlockNote)             │   │
  │  │  @blocknote/mantine  - UI components (BlockNoteView)                 │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Features                                                                    │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Notion-style block editor:                                          │   │
  │  │    - Drag and drop blocks                                            │   │
  │  │    - Slash commands (/) to add blocks                                │   │
  │  │    - Built-in formatting toolbar                                     │   │
  │  │    - Heading levels 1-3                                              │   │
  │  │    - Bullet and numbered lists                                       │   │
  │  │    - Code blocks                                                     │   │
  │  │    - Quote blocks                                                    │   │
  │  │    - Image upload (with custom handler)                              │   │
  │  │                                                                      │   │
  │  │  Image Upload Methods:                                                │   │
  │  │    1. Click image button in toolbar                                  │   │
  │  │    2. Drag & drop image into editor                                  │   │
  │  │    3. Paste image from clipboard                                     │   │
  │  │                                                                      │   │
  │  │  Constraints:                                                         │   │
  │  │    - Max image size: 10MB                                            │   │
  │  │    - Allowed types: JPEG, PNG, GIF, WEBP                             │   │
  │  │    - Uploads to server immediately (no base64)                       │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Component Props                                                             │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  interface RichTextEditorProps {                                     │   │
  │  │    value?: string       // Initial HTML content                     │   │
  │  │    onChange?: (html: string) => void  // HTML output on change      │   │
  │  │    placeholder?: string // Placeholder text (default: '写点什么…')   │   │
  │  │    minHeight?: number   // Min height in px (default: 200)          │   │
  │  │  }                                                                   │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  HTML Import/Export                                                          │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │  Import (value prop):                                                │   │
  │  │    editor.tryParseHTMLToBlocks(html) → Block[]                       │   │
  │  │                                                                      │   │
  │  │  Export (onChange callback):                                         │   │
  │  │    editor.blocksToHTMLLossy() → HTML string                          │   │
  │  │                                                                      │   │
  │  │  Note: HTML export is "lossy" - some block formatting may be         │   │
  │  │  simplified when converting to HTML.                                 │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
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

---

## Dependencies Reference

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | React DOM renderer |
| react-router-dom | ^7.1.3 | Client-side routing |

### UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| antd | ^6.0.0 | UI component library |
| @ant-design/icons | ^5.6.1 | Icon set |
| dompurify | ^3.2.4 | XSS prevention for HTML content |

### Rich Text Editor (BlockNote)

| Package | Version | Purpose |
|---------|---------|---------|
| @blocknote/core | ^0.47.3 | Core editor logic |
| @blocknote/react | ^0.47.3 | React hooks (useCreateBlockNote) |
| @blocknote/mantine | ^0.47.3 | UI components (BlockNoteView) |

**Note:** BlockNote requires all three packages:
- `@blocknote/core` - Editor instance and block management
- `@blocknote/react` - React hooks for creating editors
- `@blocknote/mantine` - Pre-built UI components (side menu, formatting toolbar, etc.)

### State Management & Data Fetching

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.8.3 | HTTP client |
| @tanstack/react-query | ^5.66.9 | Server state management |

### Internationalization

| Package | Version | Purpose |
|---------|---------|---------|
| react-i18next | ^15.4.1 | i18n framework |
| i18next | ^24.2.2 | i18n core |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ~5.7.3 | TypeScript compiler |
| vite | ^8.0.0 | Build tool |
| @types/react | ^18.3.18 | React type definitions |
| @types/react-dom | ^18.3.5 | React DOM type definitions |
| @types/dompurify | ^3.2.0 | DOMPurify type definitions |

### Installing Dependencies

```bash
# Install all dependencies
npm install

# Or install BlockNote specifically (if needed)
npm install @blocknote/core @blocknote/react @blocknote/mantine
```

---

## Component Index

| Component | Path | Description |
|-----------|------|-------------|
| LayoutShell | src/modules/layout/LayoutShell.tsx | Main layout wrapper |
| LeftNav | src/modules/layout/LeftNav.tsx | Left sidebar navigation |
| MainContent | src/modules/layout/MainContent.tsx | Content router |
| RightBar | src/modules/home/RightBar.tsx | Right sidebar (home only) |
| FeedTabs | src/modules/home/FeedTabs.tsx | Category tabs |
| FeedList | src/modules/home/FeedList.tsx | Feed list container |
| FeedPostItem | src/modules/home/FeedPostItem.tsx | Weibo-style post card |
| RichTextEditor | src/modules/posts/RichTextEditor.tsx | BlockNote editor wrapper |
| Avatar | src/modules/shared/Avatar.tsx | Avatar component |
