import React from 'react'
import { Menu, Badge } from 'antd'
import {
  MessageOutlined,
  HomeOutlined,
  EditOutlined,
  UserOutlined,
  DashboardOutlined
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './LeftNav.css'

export interface LeftNavProps {
  selectedKeys: string[]
  unreadCount: number
  adminPendingCount: number
  isAdmin: boolean
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
  onNavClick
}) => {
  const { t } = useTranslation()

  const navMenuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: (
        <Link
          to="/"
          className="wiselearn-menu-link"
          onClick={() => onNavClick?.('home')}
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
