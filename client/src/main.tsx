import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import './i18n'
import './style.css'
import { LayoutShell } from './modules/layout/LayoutShell'
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { HomePage } from './modules/home/HomePage'
import { CreatePostPage } from './modules/posts/CreatePostPage'
import { EditPostPage } from './modules/posts/EditPostPage'
import { PostDetailPage } from './modules/posts/PostDetailPage'
import { ProfilePage } from './modules/profile/ProfilePage'
import { MessagesPage } from './modules/messages/MessagesPage'
import { AdminDashboardPage } from './modules/admin/AdminDashboardPage'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'

/* 香港理工大学官方配色：理工红 #C8102E */
const POLYU_RED = '#C8102E'

const PolyUTheme: React.ComponentProps<typeof ConfigProvider>['theme'] = {
  token: {
    colorPrimary: POLYU_RED,
    colorLink: POLYU_RED,
    colorInfo: POLYU_RED,
    borderRadius: 12,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'
  },
  components: {
    Layout: {
      headerBg: '#fff',
      headerColor: 'rgba(0,0,0,0.85)',
      siderBg: '#fff'
    },
    Button: {
      colorPrimary: POLYU_RED,
      colorPrimaryHover: '#a00d24'
    },
    Menu: {
      itemColor: 'rgba(0,0,0,0.85)',
      itemSelectedBg: POLYU_RED,
      itemSelectedColor: '#fff',
      itemHoverBg: 'rgba(200, 16, 46, 0.08)',
      itemHoverColor: POLYU_RED
    },
    Card: {
      borderRadiusLG: 16
    }
  }
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!user.isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

function RequireLayout({ children }: { children: React.ReactElement }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppWithLocale() {
  const { i18n } = useTranslation()
  const antdLocale = i18n.language === 'en' ? enUS : zhCN
  return (
    <ConfigProvider locale={antdLocale} theme={PolyUTheme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireLayout>
                  <LayoutShell />
                </RequireLayout>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="create" element={<CreatePostPage />} />
              <Route path="posts/:id/edit" element={<EditPostPage />} />
              <Route path="posts/:id" element={<PostDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="messages/:userId" element={<MessagesPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <AppWithLocale />
  </React.StrictMode>
)
