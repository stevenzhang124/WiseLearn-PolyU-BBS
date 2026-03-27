import React, { useCallback, useEffect, useState } from 'react'
import { FireOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'
import './RightBar.css'

interface SidebarPost {
  id: number
  title: string
  view_count: number
  created_at: string
  published_at: string | null
}

const TOP = 10

/**
 * RightBar - 热门帖子（按浏览量）/ 最新帖子（按时间），各取前 10
 */
export const RightBar: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'views' | 'recent'>('views')
  const [byViews, setByViews] = useState<SidebarPost[]>([])
  const [byRecent, setByRecent] = useState<SidebarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [viewsRes, recentRes] = await Promise.all([
        fetchPosts({ page: 1, pageSize: TOP, sort: 'views' }),
        fetchPosts({ page: 1, pageSize: TOP, sort: 'recent' })
      ])
      const mapRow = (p: {
        id: number
        title: string
        view_count: number
        created_at: string
        published_at?: string | null
      }): SidebarPost => ({
        id: p.id,
        title: p.title,
        view_count: Number(p.view_count) || 0,
        created_at: p.created_at,
        published_at: p.published_at ?? null
      })
      setByViews((viewsRes.list ?? []).map(mapRow))
      setByRecent((recentRes.list ?? []).map(mapRow))
    } catch {
      setLoadError(true)
      setByViews([])
      setByRecent([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const list = tab === 'views' ? byViews : byRecent

  const trailing = (post: SidebarPost) => {
    if (tab === 'views') {
      return t('rightBar.viewCount', { count: post.view_count })
    }
    const at = post.published_at || post.created_at
    return new Date(at).toLocaleString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const goPost = (id: number) => {
    navigate(`/posts/${id}`)
  }

  return (
    <div className="wiselearn-right-bar">
      <div className="wiselearn-sidebar-module">
        <div className="wiselearn-sidebar-module-header">
          <div className="wiselearn-sidebar-tabs">
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${tab === 'views' ? 'active' : ''}`}
              onClick={() => setTab('views')}
            >
              <FireOutlined /> {t('rightBar.trending')}
            </button>
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${tab === 'recent' ? 'active' : ''}`}
              onClick={() => setTab('recent')}
            >
              <ClockCircleOutlined /> {t('rightBar.latest')}
            </button>
          </div>
        </div>
        <div className="wiselearn-sidebar-list">
          {loading ? (
            <Typography.Text type="secondary" className="wiselearn-sidebar-status">
              {t('common.loading')}
            </Typography.Text>
          ) : loadError ? (
            <Typography.Text type="danger" className="wiselearn-sidebar-status">
              {t('rightBar.loadFailed')}
            </Typography.Text>
          ) : list.length === 0 ? (
            <Typography.Text type="secondary" className="wiselearn-sidebar-status">
              {t('rightBar.empty')}
            </Typography.Text>
          ) : (
            list.map((post, index) => (
              <div
                key={post.id}
                className="wiselearn-sidebar-item wiselearn-sidebar-post-item"
                role="button"
                tabIndex={0}
                onClick={() => goPost(post.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    goPost(post.id)
                  }
                }}
              >
                <span className={`wiselearn-sidebar-rank ${index < 3 ? 'top' : ''}`}>{index + 1}</span>
                <span className="wiselearn-sidebar-title" title={post.title}>
                  {post.title}
                </span>
                <span className="wiselearn-sidebar-count wiselearn-sidebar-count--muted">{trailing(post)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
