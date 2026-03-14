import React, { useEffect, useState } from 'react'
import { Layout, Menu, Badge, Typography } from 'antd'
import {
  MessageOutlined,
  HomeOutlined,
  EditOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getUnreadCount } from '../shared/api'

const { Header, Content, Sider } = Layout

/**
 * 整体布局：理工红主题 + PolyU Logo + 未读私信数量（仅登录后展示，登录/注册页不包含此布局）
 */
export const LayoutShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const selectedKeys: string[] = []
  if (location.pathname.startsWith('/messages')) selectedKeys.push('messages')
  else if (location.pathname === '/create') selectedKeys.push('create')
  else if (location.pathname.startsWith('/profile')) selectedKeys.push('profile')
  else if (location.pathname.startsWith('/admin')) selectedKeys.push('admin')
  else selectedKeys.push('home')

  const fetchUnread = () => {
    if (!user) return
    getUnreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => setUnreadCount(0))
  }

  useEffect(() => {
    fetchUnread()
    const timer = setInterval(fetchUnread, 25000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    const onFocus = () => fetchUnread()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        className="wiselearn-header-white"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 24,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src="/polyu-logo.png"
            alt="香港理工大学 The Hong Kong Polytechnic University"
            className="wiselearn-header-logo"
            style={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <div className="wiselearn-header-titles">
            <span className="wiselearn-header-title">WiseLearn · 校园交流</span>
            <span className="wiselearn-header-subtitle">香港理工大学 Hong Kong Polytechnic University</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {user && (
            <Typography.Text style={{ color: 'rgba(0,0,0,0.85)' }}>
              欢迎，{user.nickname}
              {user.isAdmin ? '（管理员）' : ''}
            </Typography.Text>
          )}
          {user && (
            <Typography.Link onClick={onLogout} style={{ color: 'rgba(0,0,0,0.65)' }}>
              <LogoutOutlined /> 退出
            </Typography.Link>
          )}
        </div>
      </Header>
      <Layout>
        <Sider breakpoint="lg" collapsedWidth="0" className="wiselearn-sider-white" style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedKeys}
            style={{ borderRight: 0 }}
            className="wiselearn-side-menu"
            items={[
              {
                key: 'home',
                icon: <HomeOutlined />,
                label: <Link to="/" className="wiselearn-menu-link">首页</Link>
              },
              {
                key: 'create',
                icon: <EditOutlined />,
                label: <Link to="/create" className="wiselearn-menu-link">发帖</Link>
              },
              {
                key: 'messages',
                icon: (
                  <Badge count={unreadCount} size="small" offset={[4, 0]}>
                    <MessageOutlined style={{ fontSize: 16 }} />
                  </Badge>
                ),
                label: <Link to="/messages" className="wiselearn-menu-link">私信</Link>
              },
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: <Link to="/profile" className="wiselearn-menu-link">个人中心</Link>
              },
              ...(user?.isAdmin
                ? [
                    {
                      key: 'admin',
                      icon: <DashboardOutlined />,
                      label: <Link to="/admin" className="wiselearn-menu-link">后台管理</Link>
                    }
                  ]
                : [])
            ]}
          />
        </Sider>
        <Layout>
          <Content
            style={{
              margin: 20,
              background: '#f7f7f8',
              padding: 24,
              borderRadius: 16,
              minHeight: 280
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
