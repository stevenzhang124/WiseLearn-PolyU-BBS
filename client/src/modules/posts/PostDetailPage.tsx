import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, List, Space, Typography, message } from 'antd'
import { LikeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import {
  deleteComment,
  fetchPostDetail,
  getShareLink,
  sendComment,
  toggleLike
} from '../shared/api'
import { useAuth } from '../auth/AuthContext'

/**
 * 帖子详情页：展示正文 + 图片 + 评论树 + 点赞/分享
 */
export const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const postId = Number(id)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const handleComment = async (values: { content: string }) => {
    if (!postId) return
    setSubmitting(true)
    try {
      await sendComment({
        postId,
        content: values.content
      })
      message.success('评论成功')
      await loadDetail()
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId)
      message.success('删除成功')
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
      message.success('分享链接已复制到剪贴板')
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  if (!postId) {
    return <Typography.Text>无效的帖子 ID</Typography.Text>
  }

  const post = detail?.post
  const comments: any[] = detail?.comments ?? []

  return (
    <div>
      <Card loading={loading} style={{ marginBottom: 24 }}>
        {post && (
          <>
            <Typography.Title level={3}>{post.title}</Typography.Title>
            <Space style={{ marginBottom: 16 }} size="large">
              <span>
                作者：
                <Typography.Link
                  onClick={() =>
                    post.user_id !== user?.id &&
                    navigate(`/messages/${post.user_id}`)
                  }
                  style={
                    post.user_id === user?.id
                      ? { cursor: 'default', color: 'inherit' }
                      : undefined
                  }
                >
                  {post.author}
                  {post.user_id === user?.id ? '（我）' : '（发私信）'}
                </Typography.Link>
              </span>
              <span>浏览：{post.view_count}</span>
              <span>点赞：{post.like_count}</span>
              <span>
                发布时间：
                {new Date(post.created_at).toLocaleString('zh-CN')}
              </span>
            </Space>
            <Typography.Paragraph>
              {post.content.split('\n').map((line: string, idx: number) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
            </Typography.Paragraph>
            {post.image_urls && (
              <Space wrap>
                {String(post.image_urls)
                  .split(',')
                  .map((url: string) => url.trim())
                  .filter(Boolean)
                  .map((url: string) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      style={{ maxWidth: 200, borderRadius: 4 }}
                    />
                  ))}
              </Space>
            )}
            <Space style={{ marginTop: 16 }}>
              <Button
                icon={<LikeOutlined />}
                type={liked ? 'primary' : 'default'}
                onClick={handleLike}
              >
                {liked ? '已点赞' : '点赞'}
              </Button>
              <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                转发
              </Button>
            </Space>
          </>
        )}
      </Card>

      <Card title="评论">
        <Form onFinish={handleComment} layout="vertical">
          <Form.Item
            label="发表评论"
            name="content"
            rules={[{ required: true, message: '请输入评论内容' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
            >
              发表评论
            </Button>
          </Form.Item>
        </Form>

        <List
          itemLayout="horizontal"
          dataSource={comments}
          renderItem={(item) => (
            <li key={item.id}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Typography.Text strong>{item.author}</Typography.Text>
                  <Typography.Text type="secondary">
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </Typography.Text>
                </Space>
                <Typography.Paragraph style={{ marginBottom: 4 }}>
                  {item.content}
                </Typography.Paragraph>
                {item.author === user?.nickname && (
                  <Typography.Link onClick={() => handleDeleteComment(item.id)}>
                    删除
                  </Typography.Link>
                )}
              </Space>
            </li>
          )}
        />
      </Card>
    </div>
  )
}

