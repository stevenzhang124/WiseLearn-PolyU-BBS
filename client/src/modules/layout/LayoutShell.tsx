import React from 'react'
import { Layout, Menu, Badge, Typography } from 'antd'
import {
  MessageOutlined,
  HomeOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const { Header, Content, Sider } = Layout

/**
 * 整体布局组件：包含顶部导航（Logo + 标题 + 用户信息）
 * 以及左侧菜单（首页 / 私信 / 个人中心 / 管理后台）。
 */
export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const selectedKeys: string[] = []
  if (location.pathname.startsWith('/messages')) selectedKeys.push('messages')
  else if (location.pathname.startsWith('/profile')) selectedKeys.push('profile')
  else if (location.pathname.startsWith('/admin')) selectedKeys.push('admin')
  else selectedKeys.push('home')

  const onLogout = (): void => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 24
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 4,
              border: '2px dashed #D4AF37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D4AF37',
              fontSize: 10
            }}
          >
            替换为<br />
            PolyU Logo
          </div>
          <div>
            <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
              WiseLearn · PolyU 校园交流
            </Typography.Title>
            <Typography.Text style={{ color: '#D4AF37' }}>
              Hong Kong Polytechnic University
            </Typography.Text>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && (
            <Typography.Text style={{ color: '#fff' }}>
              欢迎，{user.nickname}
              {user.isAdmin ? '（管理员）' : ''}
            </Typography.Text>
          )}
          {user && (
            <Typography.Link onClick={onLogout} style={{ color: '#fff' }}>
              <LogoutOutlined /> 退出登录
            </Typography.Link>
          )}
        </div>
      </Header>
      <Layout>
        <Sider breakpoint="lg" collapsedWidth="0">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            items={[
              {
                key: 'home',
                icon: <HomeOutlined />,
                label: <Link to="/">首页</Link>
              },
              {
                key: 'messages',
                icon: (
                  <Badge dot>
                    <MessageOutlined />
                  </Badge>
                ),
                label: <Link to="/messages">私信</Link>
              },
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: <Link to="/profile">个人中心</Link>
              },
              ...(user?.isAdmin
                ? [
                    {
                      key: 'admin',
                      icon: <DashboardOutlined />,
                      label: <Link to="/admin">后台管理</Link>
                    }
                  ]
                : [])
            ]}
          />
        </Sider>
        <Layout>
          <Content style={{ margin: 24, background: '#fff', padding: 24 }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

