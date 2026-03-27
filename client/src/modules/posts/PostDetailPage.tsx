import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { Button, Form, Input, Space, Typography, message } from 'antd'
import { LikeOutlined, ShareAltOutlined, MessageOutlined, EditOutlined } from '@ant-design/icons'
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

/**
 * 帖子详情页：小红书风格 + 评论回复树
 */
export const PostDetailPage: React.FC = () => {
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

  if (!postId) {
    return <Typography.Text>{t('post.invalidId')}</Typography.Text>
  }

  const post = detail?.post
  const comments: any[] = detail?.comments ?? []
  const commentTree = buildCommentTree(comments)
  const coverUrl = post?.image_urls ? String(post.image_urls).split(',')[0]?.trim() : null
  const hasImageInContent = Boolean(
    post?.content && /<img[^>]*>/i.test(String(post.content))
  )

  if (loading && !detail) {
    return (
      <div className="wiselearn-detail">
        <div className="wiselearn-detail-loading wiselearn-feed-card-frame">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="wiselearn-detail">
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
          {coverUrl && !hasImageInContent && (
            <img src={coverUrl} alt="" className="wiselearn-detail-cover" />
          )}
          <div
            className="wiselearn-post-content wiselearn-detail-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content || '', {
                ADD_ATTR: ['target']
              })
            }}
          />
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
