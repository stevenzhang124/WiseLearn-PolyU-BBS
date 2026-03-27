import React, { useState } from 'react'
import { FireOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import './RightBar.css'

interface TrendingItem {
  rank: number
  title: string
  count: number
}

interface ActiveUser {
  id: number
  name: string
  avatar: string | null
  posts: number
}

/**
 * RightBar - Right sidebar with tabbed lists
 * Contains trending topics, active users, etc.
 * Only visible on home page
 */
export const RightBar: React.FC = () => {
  const { t } = useTranslation()
  const [trendingTab, setTrendingTab] = useState<'hot' | 'new'>('hot')
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts')

  // Mock data for trending topics
  const trendingTopics: TrendingItem[] = [
    { rank: 1, title: '期末考试经验分享', count: 128 },
    { rank: 2, title: '宿舍生活分享', count: 89 },
    { rank: 3, title: '求职经验交流', count: 67 },
    { rank: 4, title: '校园美食推荐', count: 54 },
    { rank: 5, title: '社团活动分享', count: 45 }
  ]

  // Mock data for active users
  const activeUsers: ActiveUser[] = [
    { id: 1, name: '张三', avatar: null, posts: 42 },
    { id: 2, name: '李四', avatar: null, posts: 38 },
    { id: 3, name: '王五', avatar: null, posts: 35 },
    { id: 4, name: '赵六', avatar: null, posts: 28 },
    { id: 5, name: '钱七', avatar: null, posts: 22 }
  ]

  return (
    <div className="wiselearn-right-bar">
      {/* Trending Topics Module */}
      <div className="wiselearn-sidebar-module">
        <div className="wiselearn-sidebar-module-header">
          <div className="wiselearn-sidebar-tabs">
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${trendingTab === 'hot' ? 'active' : ''}`}
              onClick={() => setTrendingTab('hot')}
            >
              <FireOutlined /> {t('rightBar.trending')}
            </button>
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${trendingTab === 'new' ? 'active' : ''}`}
              onClick={() => setTrendingTab('new')}
            >
              <ClockCircleOutlined /> {t('rightBar.latest')}
            </button>
          </div>
        </div>
        <div className="wiselearn-sidebar-list">
          {trendingTopics.map((item) => (
            <div key={item.rank} className="wiselearn-sidebar-item">
              <span className={`wiselearn-sidebar-rank ${item.rank <= 3 ? 'top' : ''}`}>
                {item.rank}
              </span>
              <span className="wiselearn-sidebar-title">{item.title}</span>
              <span className="wiselearn-sidebar-count">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users Module */}
      <div className="wiselearn-sidebar-module">
        <div className="wiselearn-sidebar-module-header">
          <div className="wiselearn-sidebar-tabs">
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <TrophyOutlined /> {t('rightBar.activePosters')}
            </button>
            <button
              type="button"
              className={`wiselearn-sidebar-tab ${activeTab === 'likes' ? 'active' : ''}`}
              onClick={() => setActiveTab('likes')}
            >
              <TrophyOutlined /> {t('rightBar.activeLikers')}
            </button>
          </div>
        </div>
        <div className="wiselearn-sidebar-list">
          {activeUsers.map((user, index) => (
            <div key={user.id} className="wiselearn-sidebar-item wiselearn-sidebar-user-item">
              <span className={`wiselearn-sidebar-rank ${index < 3 ? 'top' : ''}`}>
                {index + 1}
              </span>
              <div className="wiselearn-sidebar-user-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span>{user.name[0]}</span>
                )}
              </div>
              <span className="wiselearn-sidebar-username">{user.name}</span>
              <span className="wiselearn-sidebar-count">{user.posts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links Module */}
      <div className="wiselearn-sidebar-module">
        <div className="wiselearn-sidebar-module-header">
          <h4 className="wiselearn-sidebar-title-main">{t('rightBar.quickLinks')}</h4>
        </div>
        <div className="wiselearn-sidebar-links">
          <a href="/create" className="wiselearn-sidebar-link">{t('rightBar.createPost')}</a>
          <a href="/profile" className="wiselearn-sidebar-link">{t('rightBar.myProfile')}</a>
          <a href="/messages" className="wiselearn-sidebar-link">{t('rightBar.messages')}</a>
        </div>
      </div>
    </div>
  )
}
