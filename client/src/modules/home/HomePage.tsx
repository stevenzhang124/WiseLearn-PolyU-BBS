import React, { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'
import { FeedTabs } from './FeedTabs'
import { FeedList } from './FeedList'
import './HomePage.css'

/**
 * Home page with Weibo-style feed
 * Uses FeedTabs for category filtering and FeedList for post display
 */
export const HomePage: React.FC = () => {
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

  const loadPosts = async (pageNo = 1, sort: 'time' | 'hot' = sortTab) => {
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
    void loadPosts(1, sortTab)
  }, [sortTab, category])

  const refreshIfOnHome = () => {
    if (location.pathname !== '/') return
    if (loadingPosts) return
    const now = Date.now()
    if (now - lastRefreshAt.current < 8000) return
    lastRefreshAt.current = now
    void loadPosts(1, sortTab)
  }

  useEffect(() => {
    refreshIfOnHome()
  }, [location.pathname, sortTab, category])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortTab, category, location.pathname])

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
        onLoadMore={() => void loadPosts(page + 1, sortTab)}
        hasMore={total > pageSize * page}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
