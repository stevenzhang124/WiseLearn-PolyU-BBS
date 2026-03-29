import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { App } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'
import {
  HOME_FEED_RESTORE_KEY,
  HOME_FEED_RESTORE_MAX_AGE_MS,
  saveHomeFeedSnapshot,
  type HomeFeedRestorePayload
} from '../shared/homeFeedRestore'
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
  const feedCacheConsumedRef = useRef(false)
  const scrollAfterRestoreY = useRef<number | null>(null)
  const suppressFocusRefreshRef = useRef(false)
  const latestFeedRef = useRef({
    category,
    sortTab,
    posts,
    page,
    total
  })
  latestFeedRef.current = { category, sortTab, posts, page, total }

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

  useLayoutEffect(() => {
    if (location.pathname !== '/') {
      feedCacheConsumedRef.current = false
      return
    }
    const raw = sessionStorage.getItem(HOME_FEED_RESTORE_KEY)
    if (!raw) return
    try {
      const d = JSON.parse(raw) as HomeFeedRestorePayload
      if (Date.now() - d.savedAt > HOME_FEED_RESTORE_MAX_AGE_MS) {
        sessionStorage.removeItem(HOME_FEED_RESTORE_KEY)
        return
      }
      sessionStorage.removeItem(HOME_FEED_RESTORE_KEY)
      setCategory(d.category)
      setPosts(d.posts as any[])
      setPage(d.page)
      setTotal(d.total)
      feedCacheConsumedRef.current = true
      scrollAfterRestoreY.current = d.scrollY
      suppressFocusRefreshRef.current = true
      window.setTimeout(() => {
        suppressFocusRefreshRef.current = false
      }, 12000)
    } catch {
      sessionStorage.removeItem(HOME_FEED_RESTORE_KEY)
    }
  }, [location.pathname])

  useLayoutEffect(() => {
    if (location.pathname !== '/') return
    if (scrollAfterRestoreY.current == null) return
    if (posts.length === 0) return
    const y = scrollAfterRestoreY.current
    scrollAfterRestoreY.current = null
    window.scrollTo(0, y)
  }, [location.pathname, posts])

  useEffect(() => {
    if (location.pathname !== '/') return
    if (feedCacheConsumedRef.current) {
      feedCacheConsumedRef.current = false
      return
    }
    void loadPosts(1, sortTab, 'replace')
  }, [sortTab, category, loadPosts, location.pathname])

  const refreshIfOnHome = useCallback(() => {
    if (location.pathname !== '/') return
    if (suppressFocusRefreshRef.current) return
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

  /** 任意路由离开首页时写入快照（热门、详情、消息等），返回 / 时再恢复 */
  useEffect(() => {
    return () => {
      const s = latestFeedRef.current
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
      const meaningful =
        s.posts.length > 0 || s.page > 1 || scrollY >= 8
      if (!meaningful) return
      saveHomeFeedSnapshot({
        scrollY,
        category: s.category,
        sortTab: s.sortTab,
        posts: s.posts,
        page: s.page,
        total: s.total
      })
    }
  }, [])

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

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
