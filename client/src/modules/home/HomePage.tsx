import React, { useCallback, useEffect, useRef, useState } from 'react'
import { App } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'
import { FeedTabs } from './FeedTabs'
import { FeedList } from './FeedList'
import './HomePage.css'

/**
 * Home page with Weibo-style feed
 * FeedTabs 切换分类 → fetchPosts 带 category → 后端按 category 筛选（与发帖 category 字段一致）
 */
export const HomePage: React.FC = () => {
  const { message } = App.useApp()
  const [sortTab] = useState<'time' | 'hot'>('time')
  const [category, setCategory] = useState('all')
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const location = useLocation()
  const navigate = useNavigate()
  const lastRefreshAt = useRef(0)

  const loadPosts = useCallback(
    async (pageNo = 1, sort: 'time' | 'hot' = sortTab, mode: 'replace' | 'append' = 'replace') => {
      setLoadingPosts(true)
      try {
        const data = await fetchPosts({
          page: pageNo,
          pageSize,
          sort,
          ...(category !== 'all' ? { category } : {})
        })
        setPosts((prev) =>
          pageNo === 1 || mode === 'replace' ? data.list : [...prev, ...data.list]
        )
        setTotal(data.pagination.total)
        setPage(pageNo)
      } catch (err) {
        message.error((err as Error).message)
      } finally {
        setLoadingPosts(false)
      }
    },
    [category, sortTab, pageSize]
  )

  useEffect(() => {
    void loadPosts(1, sortTab, 'replace')
  }, [sortTab, category, loadPosts])

  const refreshIfOnHome = useCallback(() => {
    if (location.pathname !== '/') return
    const now = Date.now()
    if (now - lastRefreshAt.current < 8000) return
    lastRefreshAt.current = now
    void loadPosts(1, sortTab, 'replace')
  }, [location.pathname, loadPosts, sortTab])

  useEffect(() => {
    const onFocus = () => refreshIfOnHome()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshIfOnHome()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshIfOnHome])

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <div className="wiselearn-feed">
      {/* Category tabs - Campus Living, Class Q&A, etc. */}
      <FeedTabs
        activeCategory={category}
        onCategoryChange={setCategory}
      />

      {/* Feed list */}
      <FeedList
        posts={posts}
        loading={loadingPosts}
        onLoadMore={() => void loadPosts(page + 1, sortTab, 'append')}
        hasMore={total > pageSize * page}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
