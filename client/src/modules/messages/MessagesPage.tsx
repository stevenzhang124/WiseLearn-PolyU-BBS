import React, { useEffect, useState } from 'react'
import { Card, List, Input, Button, Space, Typography, message, Badge } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  fetchConversation,
  fetchConversationsList,
  sendMessage,
  getUserApi
} from '../shared/api'

/**
 * 私信页面：支持通过 URL /messages/:userId 进入与某用户的会话。
 * 无 userId 时展示会话列表（含发过消息的和别人发来的），点击进入对应会话。
 */
export const MessagesPage: React.FC = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [otherNickname, setOtherNickname] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [messagesList, setMessagesList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<
    Array<{ userId: number; nickname: string; lastMessageAt: string; unreadCount: number }>
  >([])
  const [loadingList, setLoadingList] = useState(false)

  const otherId = paramUserId ? Number(paramUserId) : null

  const loadConversation = async (targetId: number) => {
    setLoading(true)
    try {
      const [convRes, userRes] = await Promise.all([
        fetchConversation(targetId),
        getUserApi(targetId)
      ])
      setMessagesList(convRes.messages)
      setOtherNickname(userRes.nickname)
    } catch (err) {
      message.error((err as Error).message)
      setOtherNickname(null)
      setMessagesList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (otherId != null && !Number.isNaN(otherId) && otherId > 0) {
      void loadConversation(otherId)
    } else {
      setOtherNickname(null)
      setMessagesList([])
    }
  }, [otherId])

  const loadConversationsList = async () => {
    setLoadingList(true)
    try {
      const data = await fetchConversationsList()
      setConversations(data.conversations)
    } catch (err) {
      message.error((err as Error).message)
      setConversations([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (otherId == null || Number.isNaN(otherId) || otherId <= 0) {
      void loadConversationsList()
    }
  }, [otherId])

  const onSend = async () => {
    if (otherId == null || Number.isNaN(otherId) || !content.trim()) {
      message.warning('请输入私信内容')
      return
    }
    if (otherId === user?.id) {
      message.warning('不能给自己发私信')
      return
    }
    try {
      await sendMessage({ toUserId: otherId, content })
      setContent('')
      message.success('发送成功')
      await loadConversation(otherId)
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  // 无指定用户：展示会话列表（含之前发过的 + 别人发来的）
  if (otherId == null || Number.isNaN(otherId) || otherId <= 0) {
    return (
      <div>
        <Typography.Title level={3}>私信</Typography.Title>
        <Card title="会话列表">
          {loadingList ? (
            <List loading />
          ) : conversations.length === 0 ? (
            <Typography.Paragraph type="secondary">
              暂无会话。在浏览帖子时点击作者名字即可发起私信；别人给您发消息后，这里也会出现对应会话。
            </Typography.Paragraph>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(c) => (
                <List.Item
                  key={c.userId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/messages/${c.userId}`)}
                  extra={
                    c.unreadCount > 0 ? (
                      <Badge count={c.unreadCount} />
                    ) : null
                  }
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{c.nickname}</span>
                        {c.unreadCount > 0 && (
                          <Typography.Text type="danger">
                            {c.unreadCount} 条未读
                          </Typography.Text>
                        )}
                      </Space>
                    }
                    description={
                      <Typography.Text type="secondary">
                        最后消息：{new Date(c.lastMessageAt).toLocaleString('zh-CN')}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    )
  }

  // 与自己私信
  if (otherId === user?.id) {
    return (
      <div>
        <Typography.Title level={3}>私信</Typography.Title>
        <Card>
          <Typography.Paragraph type="secondary">
            不能给自己发私信。请从帖子中点击其他作者进入私信。
          </Typography.Paragraph>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>
        与 {otherNickname ?? '...'} 的对话
      </Typography.Title>

      <Card title={`与 ${otherNickname ?? '...'} 的对话`} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入私信内容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  void onSend()
                }
              }}
            />
            <Button type="primary" onClick={onSend}>
              发送
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      <Card title="会话记录">
        <List
          loading={loading}
          dataSource={messagesList}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <Space>
                <Typography.Text strong>
                  {item.from_user_id === user?.id ? '我' : otherNickname ?? `用户 ${item.from_user_id}`}
                  ：
                </Typography.Text>
                <span>{item.content}</span>
                <Typography.Text type="secondary">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
