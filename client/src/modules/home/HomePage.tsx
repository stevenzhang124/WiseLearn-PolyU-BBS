import React, { useEffect, useState } from 'react'
import { Tabs, Typography, message } from 'antd'
import './HomePage.css'
import { HeartOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'

const categories = [
  { label: '教学交流', value: 'teaching' },
  { label: '校园生活', value: 'campus' },
  { label: '求职分享', value: 'career' }
]

/** 从帖子内容取第一张图片 URL（用于列表封面） */
function getFirstImageUrl(post: { content?: string; image_urls?: string | null }): string | null {
  if (post.image_urls) {
    const first = String(post.image_urls).split(',')[0]?.trim()
    if (first) return first
  }
  if (post.content && /<img[^>]+src=["']([^"']+)["']/.test(post.content)) {
    const m = post.content.match(/<img[^>]+src=["']([^"']+)["']/)
    return m ? m[1] : null
  }
  return null
}

/**
 * 首页：小红书风格卡片流（封面图 + 标题 + 作者 + 点赞/浏览）
 */
export const HomePage: React.FC = () => {
  const [tab, setTab] = useState<'time' | 'hot'>('time')
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const navigate = useNavigate()

  const loadPosts = async (pageNo = 1, sort: 'time' | 'hot' = tab) => {
    setLoadingPosts(true)
    try {
      const data = await fetchPosts({
        page: pageNo,
        pageSize,
        sort
      })
      setPosts(data.list)
      setTotal(data.pagination.total)
      setPage(pageNo)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    void loadPosts(1, tab)
  }, [tab])

  return (
    <div className="wiselearn-feed">
      <div className="wiselearn-feed-header">
        <Typography.Title level={4} style={{ margin: 0 }}>
          发现
        </Typography.Title>
        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as 'time' | 'hot')}
          items={[
            { key: 'time', label: '最新' },
            { key: 'hot', label: '热门' }
          ]}
          className="wiselearn-feed-tabs"
        />
      </div>

      <div className="wiselearn-feed-grid">
        {loadingPosts ? (
          <div className="wiselearn-feed-loading">加载中...</div>
        ) : (
          posts.map((item) => {
            const coverUrl = getFirstImageUrl(item)
            const categoryLabel = categories.find((c) => c.value === item.category)?.label ?? item.category
            return (
              <div
                key={item.id}
                className="wiselearn-feed-card"
                onClick={() => navigate(`/posts/${item.id}`)}
              >
                <div className="wiselearn-feed-card-cover">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" />
                  ) : (
                    <div className="wiselearn-feed-card-cover-placeholder" />
                  )}
                  {item.is_pinned ? (
                    <span className="wiselearn-feed-card-pin">置顶</span>
                  ) : null}
                </div>
                <div className="wiselearn-feed-card-body">
                  <Typography.Paragraph
                    className="wiselearn-feed-card-title"
                    ellipsis={{ rows: 2 }}
                  >
                    {item.title}
                  </Typography.Paragraph>
                  <div className="wiselearn-feed-card-meta">
                    <div className="wiselearn-feed-card-author">
                      <span className="wiselearn-feed-card-avatar">
                        {(item.author || '?').charAt(0)}
                      </span>
                      <span className="wiselearn-feed-card-name">{item.author}</span>
                    </div>
                    <div className="wiselearn-feed-card-stats">
                      <span><HeartOutlined /> {item.like_count}</span>
                      <span><EyeOutlined /> {item.view_count}</span>
                    </div>
                  </div>
                  <div className="wiselearn-feed-card-tag">{categoryLabel}</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loadingPosts && total > pageSize && (
        <div className="wiselearn-feed-pagination">
          <button
            type="button"
            className="wiselearn-feed-load-more"
            onClick={() => void loadPosts(page + 1, tab)}
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  )
}
