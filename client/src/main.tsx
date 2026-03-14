import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './style.css'
import { LayoutShell } from './modules/layout/LayoutShell'
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { HomePage } from './modules/home/HomePage'
import { CreatePostPage } from './modules/posts/CreatePostPage'
import { PostDetailPage } from './modules/posts/PostDetailPage'
import { ProfilePage } from './modules/profile/ProfilePage'
import { MessagesPage } from './modules/messages/MessagesPage'
import { AdminDashboardPage } from './modules/admin/AdminDashboardPage'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'

const PolyUTheme: React.ComponentProps<typeof ConfigProvider>['theme'] = {
  token: {
    colorPrimary: '#003366',
    colorLink: '#003366',
    colorInfo: '#003366',
    borderRadius: 6,
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif'
  },
  components: {
    Layout: {
      headerBg: '#003366',
      headerColor: '#ffffff',
      siderBg: '#001b3d'
    },
    Button: {
      colorPrimary: '#D4AF37',
      colorPrimaryHover: '#e1c05f'
    },
    Menu: {
      itemActiveBg: '#001b3d',
      itemSelectedBg: '#001b3d',
      itemSelectedColor: '#D4AF37'
    }
  }
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!user.isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={PolyUTheme}>
      <AuthProvider>
        <BrowserRouter>
          <LayoutShell>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <HomePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <PrivateRoute>
                    <CreatePostPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/posts/:id"
                element={
                  <PrivateRoute>
                    <PostDetailPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/messages/:userId"
                element={
                  <PrivateRoute>
                    <MessagesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <PrivateRoute>
                    <MessagesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
            </Routes>
          </LayoutShell>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
)
