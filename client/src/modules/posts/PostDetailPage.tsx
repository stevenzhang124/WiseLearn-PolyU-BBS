import React, { useEffect, useRef, useState } from 'react'
import { App, Button, Carousel, Form, Image, Input, Space, Typography } from 'antd'
import type { CarouselRef } from 'antd/es/carousel'
import {
  LikeOutlined,
  ShareAltOutlined,
  MessageOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  deleteComment,
  fetchPostDetail,
  getShareLink,
  sendComment,
  toggleLike
} from '../shared/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { PostContentBlockNote } from './PostContentBlockNote'
import './PostDetailPage.css'

type CommentNode = { root: any; children: CommentNode[] }

/** 将扁平的 comments 转成树：parent_comment_id 为 null 的为根，其余挂在对应父评论下 */
function buildCommentTree(comments: any[]): CommentNode[] {
  const map = new Map<number, CommentNode>()
  const roots: CommentNode[] = []
  comments.forEach((c) => {
    const node = { root: c, children: [] }
    map.set(c.id, node)
  })
  comments.forEach((c) => {
    const node = map.get(c.id)!
    if (c.parent_comment_id == null) {
      roots.push(node)
    } else {
      const parent = map.get(c.parent_comment_id)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  })
  return roots
}

/** 时间格式化到分钟（不显示秒） */
const fmtTime = (s: string) =>
  new Date(s).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

const DRAG_THRESHOLD = 6

/**
 * 轮播内拖动切图后浏览器仍会派发 click，导致 antd Image 误开 preview。
 * 在容器上记录指针位移，超过阈值则在捕获阶段吞掉 click。
 */
function useSwipeGuard() {
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY }
    dragged.current = false
  }, [])

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!startPos.current || dragged.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      dragged.current = true
    }
  }, [])

  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (dragged.current) {
      e.preventDefault()
      e.stopPropagation()
      dragged.current = false
    }
    startPos.current = null
  }, [])

  return { onPointerDown, onPointerMove, onClickCapture }
}

/**
 * 帖子详情页：小红书风格 + 评论回复树
 */
export const PostDetailPage: React.FC = () => {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const postId = Number(id)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; author: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()
  const [gallerySlideIndex, setGallerySlideIndex] = useState(0)
  const galleryCarouselRef = useRef<CarouselRef>(null)
  const swipeGuard = useSwipeGuard()

  const loadDetail = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const data = await fetchPostDetail(postId)
      setDetail(data)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [postId])

  useEffect(() => {
    setGallerySlideIndex(0)
  }, [postId])

  useEffect(() => {
    if (location.hash !== '#comments') return
    if (loading || !detail) return
    const timer = window.setTimeout(() => {
      document.getElementById('wiselearn-post-comments')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 120)
    return () => clearTimeout(timer)
  }, [location.hash, loading, detail])

  const handleComment = async (values: { content: string }) => {
    if (!postId) return
    setSubmitting(true)
    try {
      await sendComment({
        postId,
        content: values.content
      })
      message.success(t('post.commentSuccess'))
      form.resetFields()
      await loadDetail()
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async () => {
    if (!postId || !replyingTo || !replyContent.trim()) return
    setSubmitting(true)
    try {
      await sendComment({
        postId,
        content: replyContent.trim(),
        parentCommentId: replyingTo.commentId
      })
      message.success(t('post.replySuccess'))
      setReplyingTo(null)
      setReplyContent('')
      await loadDetail()
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyContent('')
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId)
      message.success(t('post.deleteSuccess'))
      await loadDetail()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const handleLike = async () => {
    if (!postId) return
    try {
      const res = await toggleLike(postId)
      setLiked(res.liked)
      await loadDetail()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const handleShare = async () => {
    if (!postId) return
    try {
      const { link } = await getShareLink(postId)
      await navigator.clipboard.writeText(link)
      message.success(t('post.shareSuccess'))
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  /** 与浏览器后退一致；离开过首页后再回来会按 sessionStorage 恢复 Feed 列表与滚动 */
  const handleBack = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  if (!postId) {
    return (
      <div className="wiselearn-detail">
        <div className="wiselearn-detail-toolbar">
          <button type="button" className="wiselearn-detail-back" onClick={handleBack}>
            <LeftOutlined /> {t('post.back')}
          </button>
        </div>
        <Typography.Text>{t('post.invalidId')}</Typography.Text>
      </div>
    )
  }

  const post = detail?.post
  const comments: any[] = detail?.comments ?? []
  const commentTree = buildCommentTree(comments)
  /** 正文内嵌图片：旧帖，保持原样渲染，不启用 image_urls 顶栏图集 */
  const hasImageInContent = Boolean(
    post?.content && /<img[^>]*>/i.test(String(post.content))
  )
  const galleryUrls: string[] = post?.image_urls
    ? String(post.image_urls)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  /** 新帖：图在 image_urls、文在外层；旧帖仅走正文 */
  const showSplitImageGallery =
    galleryUrls.length > 0 && !hasImageInContent

  if (loading && !detail) {
    return (
      <div className="wiselearn-detail">
        <div className="wiselearn-detail-toolbar">
          <button type="button" className="wiselearn-detail-back" onClick={handleBack}>
            <LeftOutlined /> {t('post.back')}
          </button>
        </div>
        <div className="wiselearn-detail-loading wiselearn-feed-card-frame">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="wiselearn-detail">
      <div className="wiselearn-detail-toolbar">
        <button type="button" className="wiselearn-detail-back" onClick={handleBack}>
          <LeftOutlined /> {t('post.back')}
        </button>
      </div>
      {post && (
        <article className="wiselearn-detail-article wiselearn-feed-card-frame wiselearn-feed-card-frame--interactive">
          <h1 className="wiselearn-detail-title">{post.title}</h1>
          <div className="wiselearn-detail-author-row">
            <span
              style={{ cursor: post.user_id === user?.id ? 'default' : 'pointer' }}
              onClick={() =>
                post.user_id !== user?.id && navigate(`/users/${post.user_id}`)
              }
              role="button"
              tabIndex={0}
            >
              <Avatar
                src={post.author_avatar}
                name={post.author}
                size={40}
                className="wiselearn-detail-avatar"
              />
            </span>
            <div className="wiselearn-detail-author-info">
              <span
                className="wiselearn-detail-author-name"
                onClick={() =>
                  post.user_id !== user?.id && navigate(`/users/${post.user_id}`)
                }
                style={{
                  cursor: post.user_id === user?.id ? 'default' : 'pointer'
                }}
              >
                {post.author}
                {post.user_id === user?.id ? t('post.me') : ''}
              </span>
              <span className="wiselearn-detail-date">
                {new Date(post.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            {post.user_id === user?.id && (
              <Button
                type="default"
                icon={<EditOutlined />}
                size="small"
                onClick={() => navigate(`/posts/${postId}/edit`)}
                style={{ marginLeft: 'auto' }}
              >
                {t('post.edit')}
              </Button>
            )}
          </div>
          {showSplitImageGallery && galleryUrls.length >= 2 && (
            <div
              className="wiselearn-detail-gallery wiselearn-detail-gallery--carousel"
              role="region"
              aria-label={t('post.detailImageGallery')}
              onPointerDown={swipeGuard.onPointerDown}
              onPointerMove={swipeGuard.onPointerMove}
              onClickCapture={swipeGuard.onClickCapture}
            >
              <span className="wiselearn-detail-gallery-counter" aria-live="polite">
                {gallerySlideIndex + 1} / {galleryUrls.length}
              </span>
              <button
                type="button"
                className="wiselearn-detail-gallery-arrow wiselearn-detail-gallery-arrow--prev"
                disabled={gallerySlideIndex <= 0}
                aria-label={t('post.galleryPrev')}
                onClick={(e) => {
                  e.stopPropagation()
                  galleryCarouselRef.current?.prev()
                }}
              >
                <LeftOutlined />
              </button>
              <button
                type="button"
                className="wiselearn-detail-gallery-arrow wiselearn-detail-gallery-arrow--next"
                disabled={gallerySlideIndex >= galleryUrls.length - 1}
                aria-label={t('post.galleryNext')}
                onClick={(e) => {
                  e.stopPropagation()
                  galleryCarouselRef.current?.next()
                }}
              >
                <RightOutlined />
              </button>
              <Image.PreviewGroup>
                <Carousel
                  ref={galleryCarouselRef}
                  infinite={false}
                  arrows={false}
                  dots
                  dotPlacement="bottom"
                  draggable
                  swipe
                  touchMove
                  afterChange={(i) => setGallerySlideIndex(i)}
                >
                  {galleryUrls.map((url, i) => (
                    <div key={`${url}-${i}`} className="wiselearn-detail-gallery-slide">
                      <Image
                        src={url}
                        alt=""
                        draggable={false}
                        classNames={{
                          root: 'wiselearn-detail-gallery-image-root',
                          image: 'wiselearn-detail-gallery-image-img'
                        }}
                        preview={{
                          mask: t('home.previewImage')
                        }}
                      />
                    </div>
                  ))}
                </Carousel>
              </Image.PreviewGroup>
            </div>
          )}
          {showSplitImageGallery && galleryUrls.length === 1 && (
            <div className="wiselearn-detail-gallery wiselearn-detail-gallery--single">
              <Image
                src={galleryUrls[0]}
                alt=""
                classNames={{
                  root: 'wiselearn-detail-gallery-single-root',
                  image: 'wiselearn-detail-gallery-single-img'
                }}
                preview={{ mask: t('home.previewImage') }}
              />
            </div>
          )}
          <div className="wiselearn-post-content wiselearn-detail-content">
            <PostContentBlockNote key={postId} html={String(post.content || '')} />
          </div>
          <div className="wiselearn-detail-actions">
            <button
              type="button"
              className={`wiselearn-detail-action ${liked ? 'active' : ''}`}
              onClick={handleLike}
            >
              <LikeOutlined /> {post.like_count}
            </button>
            <button
              type="button"
              className="wiselearn-detail-action"
              onClick={handleShare}
            >
              <ShareAltOutlined /> {t('post.share')}
            </button>
            <span className="wiselearn-detail-action stat">
              <MessageOutlined /> {comments.length}
            </span>
          </div>
        </article>
      )}

      <section
        id="wiselearn-post-comments"
        className="wiselearn-detail-comments wiselearn-feed-card-frame wiselearn-feed-card-frame--interactive"
      >
        <Typography.Title level={5} className="wiselearn-detail-comments-title">
          {t('post.comments')} {comments.length > 0 && `(${comments.length})`}
        </Typography.Title>

        <Form form={form} onFinish={handleComment} className="wiselearn-detail-comment-form">
          <Form.Item
            name="content"
            rules={[{ required: true, message: t('post.commentRequired') }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={t('post.saySomething')}
              maxLength={500}
              showCount
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('post.submitComment')}
            </Button>
          </Form.Item>
        </Form>

        <div className="wiselearn-comment-list">
          {commentTree.map(({ root, children }) => {
            /** 渲染单条评论/回复，replyTargetAuthor 传入时显示"回复 B：" */
            const renderCommentBody = (
              c: any,
              replyTargetAuthor?: string,
              extraClass = ''
            ) => (
              <div key={c.id} className={`wiselearn-comment-item${extraClass ? ` ${extraClass}` : ''}`}>
                <span
                  className="wiselearn-comment-avatar-wrap"
                  role="button"
                  tabIndex={0}
                  onClick={() => c.user_id && navigate(`/users/${c.user_id}`)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && c.user_id && navigate(`/users/${c.user_id}`)
                  }
                >
                  <Avatar
                    src={c.author_avatar}
                    name={c.author}
                    size={32}
                    className="wiselearn-comment-avatar"
                  />
                </span>
                <div className="wiselearn-comment-body">
                  {/* 第一行：作者名 + 作者标签 */}
                  <div className="wiselearn-comment-meta">
                    <span
                      className="wiselearn-comment-author"
                      role="button"
                      tabIndex={0}
                      onClick={() => c.user_id && navigate(`/users/${c.user_id}`)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && c.user_id && navigate(`/users/${c.user_id}`)
                      }
                    >
                      {c.author}
                    </span>
                    {c.is_author && (
                      <span className="wiselearn-comment-author-tag">{t('post.authorLabel')}</span>
                    )}
                  </div>
                  {/* 第二行：（回复 B：）内容 */}
                  <p className="wiselearn-comment-text">
                    {replyTargetAuthor && (
                      <span className="wiselearn-comment-replyto">回复 {replyTargetAuthor}：</span>
                    )}
                    {c.content}
                  </p>
                  {/* 第三行：时间 + 操作 */}
                  <div className="wiselearn-comment-actions">
                    <span className="wiselearn-comment-time">{fmtTime(c.created_at)}</span>
                    <button
                      type="button"
                      className="wiselearn-comment-reply-btn"
                      onClick={() =>
                        setReplyingTo(
                          replyingTo?.commentId === c.id
                            ? null
                            : { commentId: c.id, author: c.author }
                        )
                      }
                    >
                      {t('post.reply')}
                    </button>
                    {c.author === user?.nickname && (
                      <button
                        type="button"
                        className="wiselearn-comment-delete-btn"
                        onClick={() => handleDeleteComment(c.id)}
                      >
                        {t('post.delete')}
                      </button>
                    )}
                  </div>
                  {replyingTo?.commentId === c.id && (
                    <div className="wiselearn-reply-inline">
                      <Input.TextArea
                        rows={2}
                        placeholder={t('post.replyTo', { name: replyingTo!.author })}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        maxLength={500}
                      />
                      <Space style={{ marginTop: 8 }}>
                        <Button
                          type="primary"
                          size="small"
                          loading={submitting}
                          onClick={() => {
                            if (replyContent.trim()) handleReply()
                          }}
                        >
                          {t('post.send')}
                        </Button>
                        <Button size="small" onClick={cancelReply}>
                          {t('post.cancel')}
                        </Button>
                      </Space>
                    </div>
                  )}
                </div>
              </div>
            )

            const renderReplyFlat = (
              n: CommentNode,
              replyTargetAuthor?: string
            ): React.ReactNode => (
              <React.Fragment key={n.root.id}>
                {renderCommentBody(n.root, replyTargetAuthor, 'is-reply')}
                {n.children.map((child) => renderReplyFlat(child, n.root.author))}
              </React.Fragment>
            )

            return (
              <div key={root.id} className="wiselearn-comment-block">
                {/* 第一层：根评论 */}
                {renderCommentBody(root)}

                {/* 第二层：所有回复（含嵌套），展平显示 */}
                {children.length > 0 && (
                  <div className="wiselearn-comment-children">
                    {children.map((reply) => renderReplyFlat(reply, root.author))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
