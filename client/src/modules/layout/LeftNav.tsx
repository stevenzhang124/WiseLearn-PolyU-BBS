import React from 'react'
import { Menu, Badge } from 'antd'
import {
  MessageOutlined,
  HomeOutlined,
  EditOutlined,
  UserOutlined,
  DashboardOutlined,
  ArrowUpOutlined
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './LeftNav.css'

export interface LeftNavProps {
  selectedKeys: string[]
  unreadCount: number
  adminPendingCount: number
  isAdmin: boolean
  /** 首页已滚动一定距离 */
  homeScrolledDown?: boolean
  /** 在首页且已滚动时点击「首页」的回调（回到顶+刷新） */
  onHomeClick?: () => void
  onNavClick?: (key: string) => void
}

/**
 * Left navigation sidebar component
 * Used in LayoutShell for both desktop Sider and mobile Drawer
 */
export const LeftNav: React.FC<LeftNavProps> = ({
  selectedKeys,
  unreadCount,
  adminPendingCount,
  isAdmin,
  homeScrolledDown = false,
  onHomeClick,
  onNavClick
}) => {
  const { t } = useTranslation()

  const isOnHomeAndScrolled = selectedKeys.includes('home') && homeScrolledDown

  const homeIcon = isOnHomeAndScrolled ? (
    <span className="wiselearn-home-back-top-icon">
      <ArrowUpOutlined />
    </span>
  ) : (
    <HomeOutlined />
  )

  const navMenuItems = [
    {
      key: 'home',
      icon: homeIcon,
      label: (
        <Link
          to="/"
          className="wiselearn-menu-link"
          onClick={(e) => {
            if (isOnHomeAndScrolled) {
              e.preventDefault()
              onHomeClick?.()
            }
            onNavClick?.('home')
          }}
        >
          {t('nav.home')}
        </Link>
      )
    },
    {
      key: 'create',
      icon: <EditOutlined />,
      label: (
        <Link
          to="/create"
          className="wiselearn-menu-link"
          onClick={() => onNavClick?.('create')}
        >
          {t('nav.create')}
        </Link>
      )
    },
    {
      key: 'messages',
      icon: (
        <Badge count={unreadCount} size="small" offset={[4, 0]}>
          <MessageOutlined style={{ fontSize: 16 }} />
        </Badge>
      ),
      label: (
        <Link
          to="/messages"
          className="wiselearn-menu-link"
          onClick={() => onNavClick?.('messages')}
        >
          {t('nav.messages')}
        </Link>
      )
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <Link
          to="/profile"
          className="wiselearn-menu-link"
          onClick={() => onNavClick?.('profile')}
        >
          {t('nav.profile')}
        </Link>
      )
    },
    ...(isAdmin
      ? [
          {
            key: 'admin',
            icon: <DashboardOutlined />,
            label: adminPendingCount > 0 ? (
              <Badge count={adminPendingCount} size="small" offset={[4, 0]}>
                <Link
                  to="/admin"
                  className="wiselearn-menu-link"
                  onClick={() => onNavClick?.('admin')}
                >
                  {t('nav.admin')}
                </Link>
              </Badge>
            ) : (
              <Link
                to="/admin"
                className="wiselearn-menu-link"
                onClick={() => onNavClick?.('admin')}
              >
                {t('nav.admin')}
              </Link>
            )
          }
        ]
      : [])
  ]

  return (
    <Menu
      theme="light"
      mode="inline"
      selectedKeys={selectedKeys}
      style={{ borderRight: 0 }}
      className="wiselearn-left-nav"
      items={navMenuItems}
    />
  )
}
