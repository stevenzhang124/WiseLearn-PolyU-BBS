import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { Button, Form, Input, Space, Typography, message } from 'antd'
import { LikeOutlined, ShareAltOutlined, MessageOutlined, EditOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
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

/** 将扁平的 comments 转成树：roots 的 parent_comment_id 为 null，children 挂在对应 root 下 */
function buildCommentTree(comments: any[]): { root: any; children: any[] }[] {
  const map = new Map<number, { root: any; children: any[] }>()
  const roots: { root: any; children: any[] }[] = []
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

  if (loading && !detail) {
    return (
      <div className="wiselearn-detail">
        <div className="wiselearn-detail-loading">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="wiselearn-detail">
      {post && (
        <article className="wiselearn-detail-article">
          <h1 className="wiselearn-detail-title">{post.title}</h1>
          <div className="wiselearn-detail-author-row">
            <span
              style={{ cursor: post.user_id === user?.id ? 'default' : 'pointer' }}
              onClick={() =>
                post.user_id !== user?.id && navigate(`/messages/${post.user_id}`)
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
                  post.user_id !== user?.id && navigate(`/messages/${post.user_id}`)
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

      <section className="wiselearn-detail-comments">
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
          {commentTree.map(({ root, children }) => (
            <div key={root.id} className="wiselearn-comment-block">
              <div className="wiselearn-comment-item">
                <Avatar
                  src={root.author_avatar}
                  name={root.author}
                  size={32}
                  className="wiselearn-comment-avatar"
                />
                <div className="wiselearn-comment-body">
                  <div className="wiselearn-comment-meta">
                    <span className="wiselearn-comment-author">{root.author}</span>
                    {root.is_author && (
                      <span className="wiselearn-comment-author-tag">{t('post.authorLabel')}</span>
                    )}
                    <span className="wiselearn-comment-time">
                      {new Date(root.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="wiselearn-comment-text">{root.content}</p>
                  <div className="wiselearn-comment-actions">
                    <button
                      type="button"
                      className="wiselearn-comment-reply-btn"
                      onClick={() =>
                        setReplyingTo(
                          replyingTo?.commentId === root.id
                            ? null
                            : { commentId: root.id, author: root.author }
                        )
                      }
                    >
                      {t('post.reply')}
                    </button>
                    {root.author === user?.nickname && (
                      <button
                        type="button"
                        className="wiselearn-comment-delete-btn"
                        onClick={() => handleDeleteComment(root.id)}
                      >
                        {t('post.delete')}
                      </button>
                    )}
                  </div>
                  {replyingTo?.commentId === root.id && (
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
              {children.length > 0 && (
                <div className="wiselearn-comment-children">
                  {children.map(({ root: sub }) => (
                    <div key={sub.id} className="wiselearn-comment-item is-reply">
                      <Avatar
                        src={sub.author_avatar}
                        name={sub.author}
                        size={32}
                        className="wiselearn-comment-avatar"
                      />
                      <div className="wiselearn-comment-body">
                        <div className="wiselearn-comment-meta">
                          <span className="wiselearn-comment-author">{sub.author}</span>
                          {sub.is_author && (
                            <span className="wiselearn-comment-author-tag">{t('post.authorLabel')}</span>
                          )}
                          <span className="wiselearn-comment-time">
                            {new Date(sub.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="wiselearn-comment-text">{sub.content}</p>
                        <div className="wiselearn-comment-actions">
                          <button
                            type="button"
                            className="wiselearn-comment-reply-btn"
                            onClick={() =>
                              setReplyingTo(
                                replyingTo?.commentId === sub.id
                                  ? null
                                  : { commentId: sub.id, author: sub.author }
                              )
                            }
                          >
                            {t('post.reply')}
                          </button>
                          {sub.author === user?.nickname && (
                            <button
                              type="button"
                              className="wiselearn-comment-delete-btn"
                              onClick={() => handleDeleteComment(sub.id)}
                            >
                              {t('post.delete')}
                            </button>
                          )}
                        </div>
                        {replyingTo?.commentId === sub.id && (
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
