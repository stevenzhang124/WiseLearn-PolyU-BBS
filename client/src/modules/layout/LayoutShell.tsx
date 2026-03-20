import React, { useEffect, useState } from 'react'
import { Layout, Menu, Badge, Typography, Drawer, Button } from 'antd'
import {
  MessageOutlined,
  HomeOutlined,
  EditOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { fetchAdminPendingPosts, getUnreadCount, getNotificationsUnreadCount, updateUserLanguageApi } from '../shared/api'

const { Header, Content, Sider } = Layout

const UNREAD_CHANGED_EVENT = 'wiselearn:unread-changed'
const ADMIN_PENDING_CHANGED_EVENT = 'wiselearn:admin-pending-changed'

/**
 * 整体布局：理工红主题 + PolyU Logo + 未读私信数量 + 语言切换
 */
export const LayoutShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [adminPendingCount, setAdminPendingCount] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  const fetchAdminPending = () => {
    if (!user?.isAdmin) return
    void fetchAdminPendingPosts(100)
      .then((data) => setAdminPendingCount(data.list?.length ?? 0))
      .catch(() => setAdminPendingCount(0))
  }

  useEffect(() => {
    fetchUnread()
    fetchAdminPending()
    const timer = setInterval(fetchUnread, 25000)
    const timer2 = setInterval(fetchAdminPending, 25000)
    return () => {
      clearInterval(timer)
      clearInterval(timer2)
    }
  }, [user])

  // 事件驱动：避免“处理完消息/待审核后角标更新延迟”
  useEffect(() => {
    if (!user) return
    const onUnreadChanged = () => fetchUnread()
    const onAdminPendingChanged = () => fetchAdminPending()
    window.addEventListener(UNREAD_CHANGED_EVENT, onUnreadChanged)
    window.addEventListener(ADMIN_PENDING_CHANGED_EVENT, onAdminPendingChanged)
    return () => {
      window.removeEventListener(UNREAD_CHANGED_EVENT, onUnreadChanged)
      window.removeEventListener(ADMIN_PENDING_CHANGED_EVENT, onAdminPendingChanged)
    }
  }, [user])

  useEffect(() => {
    const onFocus = () => {
      fetchUnread()
      fetchAdminPending()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const navMenuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: <Link to="/" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>{t('nav.home')}</Link>
    },
    {
      key: 'create',
      icon: <EditOutlined />,
      label: <Link to="/create" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>{t('nav.create')}</Link>
    },
    {
      key: 'messages',
      icon: (
        <Badge count={unreadCount} size="small" offset={[4, 0]}>
          <MessageOutlined style={{ fontSize: 16 }} />
        </Badge>
      ),
      label: <Link to="/messages" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>{t('nav.messages')}</Link>
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>{t('nav.profile')}</Link>
    },
    ...(user?.isAdmin
      ? [
          {
            key: 'admin',
            icon: <DashboardOutlined />,
            label:
              adminPendingCount > 0 ? (
                <Badge count={adminPendingCount} size="small" offset={[4, 0]}>
                  <Link to="/admin" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>
                    {t('nav.admin')}
                  </Link>
                </Badge>
              ) : (
                <Link to="/admin" className="wiselearn-menu-link" onClick={() => setMobileNavOpen(false)}>{t('nav.admin')}</Link>
              )
          }
        ]
      : [])
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        className="wiselearn-header-white"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 16,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          height: 56,
          lineHeight: '56px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            className="wiselearn-mobile-ham"
            onClick={() => setMobileNavOpen(true)}
            style={{ marginRight: 4 }}
          />
          {/* 桌面端：完整 PolyU logo */}
          <img
            src="/polyu-logo.png"
            alt="香港理工大学 The Hong Kong Polytechnic University"
            className="wiselearn-header-logo"
            style={{
              height: 40,
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          {/* 移动端：仅中国结图标 */}
          <img
            src="/polyu-knot.png"
            alt="PolyU"
            className="wiselearn-header-knot"
          />
          <div className="wiselearn-header-titles">
            <span className="wiselearn-header-title">{t('nav.headerTitle')}</span>
            <span className="wiselearn-header-subtitle">{t('nav.headerSubtitle')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wiselearn-lang-switch">
            <button
              type="button"
              className={i18n.language === 'zh' ? 'active' : ''}
              onClick={() => setLang('zh')}
            >
              <span className="wiselearn-lang-full">{t('lang.zh')}</span>
              <span className="wiselearn-lang-abbr">中</span>
            </button>
            <span style={{ color: '#ddd', margin: '0 2px' }}>|</span>
            <button
              type="button"
              className={i18n.language === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              <span className="wiselearn-lang-full">{t('lang.en')}</span>
              <span className="wiselearn-lang-abbr">EN</span>
            </button>
          </span>
          {user && (
            <span className="wiselearn-header-user" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar src={user.avatar} name={user.nickname} size={28} />
              <Typography.Text className="wiselearn-header-username" style={{ color: 'rgba(0,0,0,0.85)', fontSize: 14 }}>
                {t('nav.welcome', { name: user.nickname })}
                {user.isAdmin ? t('nav.adminBadge') : ''}
              </Typography.Text>
            </span>
          )}
          {user && (
            <Typography.Link onClick={onLogout} style={{ color: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LogoutOutlined />
              <span className="wiselearn-header-logout-text">{t('nav.logout')}</span>
            </Typography.Link>
          )}
        </div>
      </Header>

      {/* Mobile navigation drawer */}
      <Drawer
        open={mobileNavOpen}
        placement="left"
        onClose={() => setMobileNavOpen(false)}
        width={220}
        styles={{ body: { padding: 0 }, header: { padding: '12px 16px' } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/polyu-logo.png" alt="PolyU" style={{ height: 28, objectFit: 'contain' }} />
          </div>
        }
        className="wiselearn-mobile-nav-drawer"
      >
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={selectedKeys}
          style={{ borderRight: 0, paddingTop: 8 }}
          className="wiselearn-side-menu"
          items={navMenuItems}
        />
        {user && (
          <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', marginTop: 'auto' }}>
            <Typography.Link onClick={() => { setMobileNavOpen(false); onLogout() }} style={{ color: 'rgba(0,0,0,0.65)' }}>
              <LogoutOutlined /> {t('nav.logout')}
            </Typography.Link>
          </div>
        )}
      </Drawer>

      <Layout>
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          trigger={null}
          className="wiselearn-sider-white"
          style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedKeys}
            style={{ borderRight: 0 }}
            className="wiselearn-side-menu"
            items={navMenuItems}
          />
        </Sider>
        <Layout>
          <Content className="wiselearn-content-area">
            <Outlet />
          </Content>
        </Layout>
      </Layout>

      {/* 移动端底部导航栏（小红书风格） */}
      <nav className="wiselearn-bottom-nav">
        <Link to="/" className={`wiselearn-bottom-nav-item${selectedKeys.includes('home') ? ' active' : ''}`}>
          <HomeOutlined className="wiselearn-bottom-nav-icon" />
          <span className="wiselearn-bottom-nav-label">{t('nav.home')}</span>
        </Link>
        <Link to="/create" className={`wiselearn-bottom-nav-item${selectedKeys.includes('create') ? ' active' : ''}`}>
          <div className="wiselearn-bottom-nav-plus">
            <PlusOutlined />
          </div>
        </Link>
        <Link to="/messages" className={`wiselearn-bottom-nav-item${selectedKeys.includes('messages') ? ' active' : ''}`}>
          <Badge count={unreadCount} size="small" offset={[8, 0]}>
            <MessageOutlined className="wiselearn-bottom-nav-icon" />
          </Badge>
          <span className="wiselearn-bottom-nav-label">{t('nav.messages')}</span>
        </Link>
        <Link to="/profile" className={`wiselearn-bottom-nav-item${selectedKeys.includes('profile') ? ' active' : ''}`}>
          <UserOutlined className="wiselearn-bottom-nav-icon" />
          <span className="wiselearn-bottom-nav-label">{t('nav.profile')}</span>
        </Link>
        {user?.isAdmin && (
          <Link to="/admin" className={`wiselearn-bottom-nav-item${selectedKeys.includes('admin') ? ' active' : ''}`}>
            <Badge count={adminPendingCount} size="small" offset={[8, 0]}>
              <DashboardOutlined className="wiselearn-bottom-nav-icon" />
            </Badge>
            <span className="wiselearn-bottom-nav-label">{t('nav.admin')}</span>
          </Link>
        )}
      </nav>
    </Layout>
  )
}
