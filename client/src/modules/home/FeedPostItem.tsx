import React from 'react'
import { LikeOutlined, MessageOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../shared/Avatar'
import './FeedList.css'

export interface FeedPostItemProps {
  post: {
    id: number
    title: string
    content: string
    author: string
    author_avatar: string | null
    user_id: number
    like_count: number
    view_count: number
    image_urls?: string
    created_at: string
    is_pinned?: number
    category: string
  }
  onNavigate: (path: string) => void
  /** 资料页等场景：不展示头像与昵称，仅展示时间 */
  headerMode?: 'full' | 'timeOnly'
}

/**
 * Extract all image URLs for gallery
 */
function getImageUrls(post: FeedPostItemProps['post']): string[] {
  const urls: string[] = []
  if (post.image_urls) {
    const parsed = String(post.image_urls).split(',').map(s => s.trim()).filter(Boolean)
    urls.push(...parsed)
  }
  // Also extract from content if not already captured
  if (post.content) {
    const regex = /<img[^>]+src=["']([^"']+)["']/g
    let match
    while ((match = regex.exec(post.content)) !== null) {
      if (!urls.includes(match[1])) {
        urls.push(match[1])
      }
    }
  }
  return urls.slice(0, 9) // Max 9 images
}

/**
 * Weibo-style feed post item
 * Horizontal layout with author row, content preview, image gallery, and action bar
 */
export const FeedPostItem: React.FC<FeedPostItemProps> = ({
  post,
  onNavigate,
  headerMode = 'full'
}) => {
  const { t, i18n } = useTranslation()
  const imageUrls = getImageUrls(post)
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryLabel = (category: string) => {
    return t(`home.category.${category}` as const) || category
  }

  const getImageGridClass = () => {
    const count = imageUrls.length
    if (count === 1) return 'single'
    if (count === 2) return 'double'
    if (count === 4) return 'quad'
    return 'multiple'
  }

  const pinned = Boolean(post.is_pinned)

  return (
    <div className={`wiselearn-feed-item${headerMode === 'timeOnly' ? ' wiselearn-feed-item--profile' : ''}`}>
      {/* Author row */}
      <div
        className={
          headerMode === 'timeOnly'
            ? 'wiselearn-feed-item-header wiselearn-feed-item-header--time-only'
            : 'wiselearn-feed-item-header'
        }
      >
        {headerMode === 'timeOnly' ? (
          <span className="wiselearn-feed-item-time-only">{formatTime(post.created_at)}</span>
        ) : (
          <div
            className="wiselearn-feed-item-author"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate(`/users/${post.user_id}`)}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate(`/users/${post.user_id}`)}
          >
            <Avatar
              src={post.author_avatar}
              name={post.author}
              size={44}
              className="wiselearn-feed-item-avatar"
            />
            <div className="wiselearn-feed-item-author-info">
              <span className="wiselearn-feed-item-author-name">{post.author}</span>
              <span className="wiselearn-feed-item-date">{formatTime(post.created_at)}</span>
            </div>
          </div>
        )}
        {pinned ? <span className="wiselearn-feed-item-pin">{t('home.pinned')}</span> : null}
      </div>

      {/* Title */}
      <h3
        className="wiselearn-feed-item-title"
        onClick={() => onNavigate(`/posts/${post.id}`)}
      >
        {post.title}
      </h3>

      {/* Content preview */}
      <div
        className="wiselearn-feed-item-excerpt"
        onClick={() => onNavigate(`/posts/${post.id}`)}
        dangerouslySetInnerHTML={{
          __html: post.content?.replace(/<img[^>]*>/gi, '').slice(0, 300) || ''
        }}
      />

      {/* Image gallery */}
      {imageUrls.length > 0 && (
        <div className={`wiselearn-feed-item-gallery ${getImageGridClass()}`}>
          {imageUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt=""
              className="wiselearn-feed-item-gallery-img"
              onClick={() => onNavigate(`/posts/${post.id}`)}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="wiselearn-feed-item-actions">
        <button
          type="button"
          className="wiselearn-feed-item-action"
          onClick={() => onNavigate(`/posts/${post.id}`)}
        >
          <LikeOutlined /> {post.like_count}
        </button>
        <button
          type="button"
          className="wiselearn-feed-item-action"
          onClick={() => onNavigate(`/posts/${post.id}`)}
        >
          <MessageOutlined /> {t('post.comment')}
        </button>
        <button type="button" className="wiselearn-feed-item-action">
          <ShareAltOutlined /> {t('post.share')}
        </button>
        <span className="wiselearn-feed-item-stat">
          <EyeOutlined /> {post.view_count}
        </span>
        <span className="wiselearn-feed-item-tag">{getCategoryLabel(post.category)}</span>
      </div>
    </div>
  )
}
