import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  LikeOutlined,
  LikeFilled,
  MessageOutlined,
  SendOutlined,
  ShareAltOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { App, Button, Image, Input } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { ShareCard } from '../shared/ShareCard'
import { fetchPostComments, getShareLink, sendComment, toggleLike } from '../shared/api'
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
    /** 评论条数（含回复），列表接口返回 */
    comment_count?: number
    /** 分享次数（用户点击分享生成链接时 +1） */
    share_count?: number
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

/** 列表正文去图后的纯文本长度，用于判断是否显示「展开全文」 */
function plainTextLengthFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return [...text].length
}

const FEED_CONTENT_EXPAND_THRESHOLD = 140

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
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0)
  const [shareCount, setShareCount] = useState(post.share_count ?? 0)
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
  const [comments, setComments] = useState<any[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const commentsFetchedRef = useRef(false)
  /** 正文过长时折叠，点击展开全文（微博式） */
  const [contentExpanded, setContentExpanded] = useState(false)

  useEffect(() => {
    setContentExpanded(false)
  }, [post.id])

  useEffect(() => {
    setLikeCount(post.like_count)
    setLiked(Boolean(post.user_liked))
    setCommentCount(post.comment_count ?? 0)
    setShareCount(post.share_count ?? 0)
  }, [post.id, post.like_count, post.user_liked, post.comment_count, post.share_count])

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

  const contentHtmlForFeed = (post.content || '').replace(/<img[^>]*>/gi, '')
  const needsContentExpand =
    plainTextLengthFromHtml(contentHtmlForFeed) > FEED_CONTENT_EXPAND_THRESHOLD

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

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const data = await fetchPostComments(post.id, 5)
      setComments(data.comments)
      setCommentTotal(data.total)
      setCommentCount(data.total)
      commentsFetchedRef.current = true
    } catch {
      /* silent */
    } finally {
      setCommentsLoading(false)
    }
  }, [post.id])

  const handleCommentToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCommentOpen((prev) => {
      const next = !prev
      if (next && !commentsFetchedRef.current) {
        void loadComments()
      }
      return next
    })
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
      void loadComments()
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
      const { link, share_count: sc } = await getShareLink(post.id)
      setShareUrl(link)
      setShareCount(sc)
      setShareOpen(true)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setShareLoading(false)
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

      {/* Content preview：过长时折叠，可展开全文（仿微博） */}
      <div className="wiselearn-feed-item-excerpt-wrap">
        <div
          className={`wiselearn-feed-item-excerpt${
            needsContentExpand && !contentExpanded ? ' wiselearn-feed-item-excerpt--collapsed' : ''
          }`}
          onClick={() => onNavigate(`/posts/${post.id}`)}
          dangerouslySetInnerHTML={{
            __html: contentHtmlForFeed || ''
          }}
        />
        {needsContentExpand ? (
          <div className="wiselearn-feed-expand-row">
            <button
              type="button"
              className="wiselearn-feed-expand-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setContentExpanded((v) => !v)
              }}
            >
              {contentExpanded ? t('home.collapseFull') : t('home.expandFull')}
            </button>
          </div>
        ) : null}
      </div>

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
          <MessageOutlined /> <span>{commentCount}</span>
        </button>
        <button
          type="button"
          className="wiselearn-feed-item-action"
          onClick={openShare}
          disabled={shareLoading}
        >
          <ShareAltOutlined /> <span>{shareCount}</span>
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
          {/* 评论输入框 */}
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
                  autoSize={{ minRows: 1, maxRows: 4 }}
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

          {/* 已有评论列表（最多 5 条，含二级回复） */}
          {commentsLoading && comments.length === 0 ? (
            <div className="wiselearn-feed-comments__loading">{t('post.comments')}...</div>
          ) : comments.length > 0 ? (
            <div className="wiselearn-feed-comments">
              {(() => {
                const roots = comments.filter((c) => c.parent_comment_id == null)
                const childMap = new Map<number, any[]>()
                for (const c of comments) {
                  if (c.parent_comment_id != null) {
                    const arr = childMap.get(c.parent_comment_id) || []
                    arr.push(c)
                    childMap.set(c.parent_comment_id, arr)
                  }
                }
                return roots.map((root) => (
                  <div key={root.id} className="wiselearn-feed-comment-block">
                    <div className="wiselearn-feed-comment">
                      <Avatar
                        src={root.author_avatar}
                        name={root.author}
                        size={28}
                        className="wiselearn-feed-comment__avatar"
                      />
                      <div className="wiselearn-feed-comment__body">
                        <span className="wiselearn-feed-comment__author">{root.author}</span>
                        <span className="wiselearn-feed-comment__text">{root.content}</span>
                        <span className="wiselearn-feed-comment__time">
                          {new Date(root.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'zh-CN', {
                            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    {(childMap.get(root.id) || []).map((reply) => (
                      <div key={reply.id} className="wiselearn-feed-comment wiselearn-feed-comment--reply">
                        <Avatar
                          src={reply.author_avatar}
                          name={reply.author}
                          size={22}
                          className="wiselearn-feed-comment__avatar"
                        />
                        <div className="wiselearn-feed-comment__body">
                          <span className="wiselearn-feed-comment__author">{reply.author}</span>
                          <span className="wiselearn-feed-comment__reply-indicator">
                            {t('post.reply')} {root.author}：
                          </span>
                          <span className="wiselearn-feed-comment__text">{reply.content}</span>
                          <span className="wiselearn-feed-comment__time">
                            {new Date(reply.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'zh-CN', {
                              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              })()}
              {commentTotal > comments.length && (
                <button
                  type="button"
                  className="wiselearn-feed-comments__view-all"
                  onClick={() => onNavigate(`/posts/${post.id}#comments`)}
                >
                  {t('post.viewAllComments', { count: commentTotal })}
                </button>
              )}
            </div>
          ) : commentsFetchedRef.current ? (
            <div className="wiselearn-feed-comments__empty">{t('notifications.noComments')}</div>
          ) : null}
        </div>
      )}

      <ShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={post.title}
        excerpt={post.content || ''}
        coverUrl={imageUrls[0]}
        authorName={post.author}
        authorAvatar={post.author_avatar}
        shareUrl={shareUrl}
      />
    </div>
  )
}
