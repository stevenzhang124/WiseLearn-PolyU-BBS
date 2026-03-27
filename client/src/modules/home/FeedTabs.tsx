import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './FeedTabs.css'

export interface FeedTabsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const DRAG_THRESHOLD_PX = 4

/**
 * FeedTabs - 与发帖分类 category 字段一致；横向可滚区域带左右渐变、拖拽与滚轮劫持（仅滚动本栏）
 */
export const FeedTabs: React.FC<FeedTabsProps> = ({ activeCategory, onCategoryChange }) => {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  const pointerIdRef = useRef<number | null>(null)
  const dragStartXRef = useRef(0)
  const dragStartScrollRef = useRef(0)
  const dragMovedRef = useRef(false)

  const updateFades = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const max = scrollWidth - clientWidth
    if (max <= 1) {
      setFadeLeft(false)
      setFadeRight(false)
      return
    }
    setFadeLeft(scrollLeft > 2)
    setFadeRight(scrollLeft < max - 2)
  }, [])

  useEffect(() => {
    updateFades()
    const el = scrollerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => updateFades())
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateFades])

  /** 滚轮：纵向映射为横向；横向只滚本栏；阻止页面滚动与浏览器前进后退 */
  useEffect(() => {
    const root = rootRef.current
    const scroller = scrollerRef.current
    if (!root || !scroller) return

    const onWheel = (e: WheelEvent) => {
      const max = scroller.scrollWidth - scroller.clientWidth
      if (max <= 0) return

      const primary = e.deltaX !== 0 ? e.deltaX : e.deltaY
      if (primary === 0) return

      e.preventDefault()
      e.stopPropagation()

      const prev = scroller.scrollLeft
      scroller.scrollLeft += primary
      if (scroller.scrollLeft !== prev) updateFades()
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [updateFades])

  const blockNextClickIfDragged = useCallback(() => {
    if (!dragMovedRef.current) return
    dragMovedRef.current = false
    const root = rootRef.current
    const onClickCapture = (ev: MouseEvent) => {
      if (root && ev.target instanceof Node && root.contains(ev.target)) {
        ev.preventDefault()
        ev.stopPropagation()
        ev.stopImmediatePropagation()
      }
      document.removeEventListener('click', onClickCapture, true)
    }
    document.addEventListener('click', onClickCapture, true)
  }, [])

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (e.button !== 0) return
    pointerIdRef.current = e.pointerId
    dragStartXRef.current = e.clientX
    dragStartScrollRef.current = scrollerRef.current?.scrollLeft ?? 0
    dragMovedRef.current = false
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current !== e.pointerId) return
    const el = scrollerRef.current
    if (!el) return
    const dx = e.clientX - dragStartXRef.current
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
      if (!dragMovedRef.current) {
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      dragMovedRef.current = true
      el.scrollLeft = dragStartScrollRef.current - dx
      updateFades()
    }
  }

  const onPointerUpOrCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    try {
      scrollerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    blockNextClickIfDragged()
  }

  const categories = [
    { key: 'all', label: t('home.category.all') },
    { key: 'campus', label: t('home.category.campus') },
    { key: 'teaching', label: t('home.category.teaching') },
    { key: 'news', label: t('home.category.news') },
    { key: 'trading', label: t('home.category.trading') },
    { key: 'career', label: t('home.category.career') },
    { key: 'mutual', label: t('home.category.mutual') }
  ]

  return (
    <div ref={rootRef} className="wiselearn-feed-tabs-root">
      {fadeLeft ? <div className="wiselearn-feed-tabs-fade wiselearn-feed-tabs-fade--left" aria-hidden /> : null}
      {fadeRight ? <div className="wiselearn-feed-tabs-fade wiselearn-feed-tabs-fade--right" aria-hidden /> : null}
      <div
        ref={scrollerRef}
        className="wiselearn-feed-tabs-scroller"
        onScroll={updateFades}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        role="tablist"
        aria-label={t('home.feedTabsAria')}
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.key}
            className={`wiselearn-feed-tab ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
