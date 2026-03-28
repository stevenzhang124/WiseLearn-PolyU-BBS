import React, { useEffect, useRef, useState } from 'react'
import {
  LikeOutlined,
  LikeFilled,
  MessageOutlined,
  SendOutlined,
  ShareAltOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { App, Button, Image, Input, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { getShareLink, sendComment, toggleLike } from '../shared/api'
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
    /** 当前登录用户是否已赞（列表接口返回） */
    user_liked?: boolean
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
  const { message } = App.useApp()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const commentTextareaRef = useRef<React.ComponentRef<typeof Input.TextArea>>(null)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [liked, setLiked] = useState(Boolean(post.user_liked))
  const [likeLoading, setLikeLoading] = useState(false)
  /** 点赞成功瞬间触发的图标动画 */
  const [likePop, setLikePop] = useState(false)
  const likePopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  useEffect(() => {
    setLikeCount(post.like_count)
    setLiked(Boolean(post.user_liked))
  }, [post.id, post.like_count, post.user_liked])

  useEffect(() => {
    if (!commentOpen) return
    const id = window.requestAnimationFrame(() => {
      commentTextareaRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [commentOpen])

  useEffect(() => {
    return () => {
      if (likePopTimerRef.current) clearTimeout(likePopTimerRef.current)
    }
  }, [])

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

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (likeLoading) return
    const wasLiked = liked
    setLikeLoading(true)
    try {
      const res = await toggleLike(post.id)
      setLiked(res.liked)
      setLikeCount((c) => (res.liked ? c + 1 : Math.max(0, c - 1)))
      if (res.liked && !wasLiked) {
        if (likePopTimerRef.current) clearTimeout(likePopTimerRef.current)
        setLikePop(false)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLikePop(true)
            likePopTimerRef.current = setTimeout(() => {
              setLikePop(false)
              likePopTimerRef.current = null
            }, 700)
          })
        })
      }
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleCommentToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCommentOpen((open) => !open)
  }

  const submitInlineComment = async () => {
    const text = commentText.trim()
    if (!text) {
      message.warning(t('post.commentRequired'))
      return
    }
    if (!user) {
      message.warning(t('post.loginToComment'))
      onNavigate('/login')
      return
    }
    setCommentSubmitting(true)
    try {
      await sendComment({ postId: post.id, content: text })
      message.success(t('post.commentSuccess'))
      setCommentText('')
      setCommentOpen(false)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const openShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShareLoading(true)
    try {
      const { link } = await getShareLink(post.id)
      setShareUrl(link)
      setShareOpen(true)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setShareLoading(false)
    }
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      message.success(t('post.linkCopied'))
    } catch {
      message.error(t('post.copyFailed'))
    }
  }

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

      {/* Image gallery：点击大图预览，多图可在预览内左右切换 */}
      {imageUrls.length > 0 && (
        <div
          className={`wiselearn-feed-item-gallery ${getImageGridClass()}`}
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label={t('home.feedImageGallery')}
        >
          <Image.PreviewGroup>
            {imageUrls.map((url, index) => (
              <Image
                key={`${post.id}-${index}-${url}`}
                src={url}
                alt=""
                classNames={{
                  root: 'wiselearn-feed-item-gallery-img-root',
                  image: 'wiselearn-feed-item-gallery-img'
                }}
                preview={{
                  mask: t('home.previewImage')
                }}
              />
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      {/* Action bar */}
      <div className="wiselearn-feed-item-actions">
        <button
          type="button"
          className={`wiselearn-feed-item-action wiselearn-feed-item-action--like${liked ? ' active' : ''}`}
          onClick={handleLike}
          disabled={likeLoading}
        >
          <span
            className={`wiselearn-feed-item-like-wrap${likePop ? ' wiselearn-feed-item-like-wrap--pop' : ''}`}
            aria-hidden
          >
            {liked ? <LikeFilled className="wiselearn-feed-item-like-icon" /> : <LikeOutlined />}
          </span>
          <span className={likePop ? 'wiselearn-feed-item-like-count--pop' : undefined}>{likeCount}</span>
        </button>
        <button
          type="button"
          className={`wiselearn-feed-item-action${commentOpen ? ' active' : ''}`}
          onClick={handleCommentToggle}
        >
          <MessageOutlined /> {t('post.comment')}
        </button>
        <button
          type="button"
          className="wiselearn-feed-item-action"
          onClick={openShare}
          disabled={shareLoading}
        >
          <ShareAltOutlined /> {t('post.share')}
        </button>
        <span className="wiselearn-feed-item-stat">
          <EyeOutlined /> {post.view_count}
        </span>
        <span className="wiselearn-feed-item-tag">{getCategoryLabel(post.category)}</span>
      </div>

      {commentOpen && (
        <div
          className="wiselearn-feed-item-inline-comment"
          onClick={(e) => e.stopPropagation()}
          role="region"
          aria-label={t('post.comment')}
        >
          <div className="wiselearn-feed-item-inline-comment__row">
            <Avatar
              src={user?.avatar ?? null}
              name={user?.nickname || 'U'}
              size={36}
              className="wiselearn-feed-item-inline-comment__avatar"
            />
            <div className="wiselearn-feed-item-inline-comment__field">
              <div className="wiselearn-feed-item-inline-comment__textarea-wrap">
                <Input.TextArea
                  ref={commentTextareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('post.feedInlineCommentPlaceholder')}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={2000}
                  className="wiselearn-feed-item-inline-comment__textarea"
                  onPressEnter={(e) => {
                    if (e.shiftKey) return
                    e.preventDefault()
                    void submitInlineComment()
                  }}
                />
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  loading={commentSubmitting}
                  className="wiselearn-feed-item-inline-comment__send-circle"
                  aria-label={t('post.send')}
                  onClick={() => void submitInlineComment()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        title={t('post.share')}
        open={shareOpen}
        onCancel={() => setShareOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input readOnly value={shareUrl} />
          <Button type="primary" onClick={() => void copyShareLink()}>
            {t('post.copyLink')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
