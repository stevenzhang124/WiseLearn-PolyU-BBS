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
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { getUnreadCount, getNotificationsUnreadCount, updateUserLanguageApi } from '../shared/api'

const { Header, Content, Sider } = Layout

/**
 * 整体布局：理工红主题 + PolyU Logo + 未读私信数量 + 语言切换
 */
export const LayoutShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const setLang = (lng: 'zh' | 'en') => {
    i18n.changeLanguage(lng)
    localStorage.setItem('wiselearn_lang', lng)
    void updateUserLanguageApi(lng).catch(() => {
      // ignore: language persistence is best-effort
    })
  }

  useEffect(() => {
    if (!user) return
    const lng = i18n.language === 'en' ? 'en' : 'zh'
    void updateUserLanguageApi(lng).catch(() => {
      // ignore: language persistence is best-effort
    })
  }, [user, i18n.language])

  const selectedKeys: string[] = []
  if (location.pathname.startsWith('/messages')) selectedKeys.push('messages')
  else if (location.pathname === '/create') selectedKeys.push('create')
  else if (location.pathname.startsWith('/profile')) selectedKeys.push('profile')
  else if (location.pathname.startsWith('/admin')) selectedKeys.push('admin')
  else selectedKeys.push('home')

  const fetchUnread = () => {
    if (!user) return
    Promise.all([getUnreadCount(), getNotificationsUnreadCount()])
      .then(([msg, notif]) =>
        setUnreadCount(msg.count + notif.likes + notif.follows + notif.comments)
      )
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
            <span className="wiselearn-header-title">{t('nav.headerTitle')}</span>
            <span className="wiselearn-header-subtitle">{t('nav.headerSubtitle')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="wiselearn-lang-switch">
            <button
              type="button"
              className={i18n.language === 'zh' ? 'active' : ''}
              onClick={() => setLang('zh')}
            >
              {t('lang.zh')}
            </button>
            <span style={{ color: '#ddd', margin: '0 4px' }}>|</span>
            <button
              type="button"
              className={i18n.language === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              {t('lang.en')}
            </button>
          </span>
          {user && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar src={user.avatar} name={user.nickname} size={32} />
              <Typography.Text style={{ color: 'rgba(0,0,0,0.85)' }}>
                {t('nav.welcome', { name: user.nickname })}
                {user.isAdmin ? t('nav.adminBadge') : ''}
              </Typography.Text>
            </span>
          )}
          {user && (
            <Typography.Link onClick={onLogout} style={{ color: 'rgba(0,0,0,0.65)' }}>
              <LogoutOutlined /> {t('nav.logout')}
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
                label: <Link to="/" className="wiselearn-menu-link">{t('nav.home')}</Link>
              },
              {
                key: 'create',
                icon: <EditOutlined />,
                label: <Link to="/create" className="wiselearn-menu-link">{t('nav.create')}</Link>
              },
              {
                key: 'messages',
                icon: (
                  <Badge count={unreadCount} size="small" offset={[4, 0]}>
                    <MessageOutlined style={{ fontSize: 16 }} />
                  </Badge>
                ),
                label: <Link to="/messages" className="wiselearn-menu-link">{t('nav.messages')}</Link>
              },
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: <Link to="/profile" className="wiselearn-menu-link">{t('nav.profile')}</Link>
              },
              ...(user?.isAdmin
                ? [
                    {
                      key: 'admin',
                      icon: <DashboardOutlined />,
                      label: <Link to="/admin" className="wiselearn-menu-link">{t('nav.admin')}</Link>
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
