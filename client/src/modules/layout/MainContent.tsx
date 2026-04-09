import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HomePage } from '../home/HomePage'
import { CreatePostPage } from '../posts/CreatePostPage'
import { EditPostPage } from '../posts/EditPostPage'
import { PostDetailPage } from '../posts/PostDetailPage'
import { UserProfilePage } from '../user/UserProfilePage'
import { ProfilePage } from '../profile/ProfilePage'
import { ProfileFollowListPage } from '../profile/ProfileFollowListPage'
import { MessagesPage } from '../messages/MessagesPage'
import { AdminDashboardPage } from '../admin/AdminDashboardPage'
import { useAuth } from '../auth/AuthContext'
import './MainContent.css'

/**
 * Admin route guard - only accessible by admins
 */
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!user.isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

/**
 * MainContent component - renders different pages based on current route
 * This replaces the React Router Outlet pattern with explicit routing
 * All pages are rendered here, and the parent controls RightBar visibility
 */
export const MainContent: React.FC = () => {
  return (
    <div className="wiselearn-main-content">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePostPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/posts/:id/edit" element={<EditPostPage />} />
        <Route path="/users/:id" element={<UserProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/following" element={<ProfileFollowListPage />} />
        <Route path="/profile/followers" element={<ProfileFollowListPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:userId" element={<MessagesPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
