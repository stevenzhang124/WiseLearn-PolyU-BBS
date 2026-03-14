import React, { useEffect, useState, useRef } from 'react'
import { Card, List, Input, Button, Typography, message, Badge } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  fetchConversation,
  fetchConversationsList,
  sendMessage,
  getUserApi
} from '../shared/api'

import './MessagesPage.css'

/**
 * 私信：会话列表 + 微信/QQ 风格气泡聊天
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const otherId = paramUserId ? Number(paramUserId) : null

  const loadConversation = async (targetId: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [convRes, userRes] = await Promise.all([
        fetchConversation(targetId),
        getUserApi(targetId)
      ])
      setMessagesList(convRes.messages)
      setOtherNickname(userRes.nickname)
    } catch (err) {
      if (!silent) message.error((err as Error).message)
      setOtherNickname(null)
      setMessagesList([])
    } finally {
      if (!silent) setLoading(false)
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

  /* 聊天界面轮询新消息，实现近实时收到对方消息 */
  useEffect(() => {
    if (otherId == null || Number.isNaN(otherId) || otherId <= 0 || otherId === user?.id) return
    const timer = setInterval(() => {
      void loadConversation(otherId, true)
    }, 3000)
    return () => clearInterval(timer)
  }, [otherId, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesList])

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
      await loadConversation(otherId)
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  if (otherId == null || Number.isNaN(otherId) || otherId <= 0) {
    return (
      <div className="wiselearn-messages-list">
        <Typography.Title level={4} style={{ marginBottom: 16 }}>
          私信
        </Typography.Title>
        <Card className="wiselearn-card" title="会话列表">
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
                  className="wiselearn-conv-item"
                  onClick={() => navigate(`/messages/${c.userId}`)}
                  extra={
                    c.unreadCount > 0 ? (
                      <Badge count={c.unreadCount} size="small" />
                    ) : null
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div className="wiselearn-conv-avatar">
                      {(c.nickname || '?').charAt(0)}
                    </div>
                    <div className="wiselearn-conv-body">
                      <div className="wiselearn-conv-name">
                        {c.nickname}
                        {c.unreadCount > 0 && (
                          <span className="wiselearn-conv-unread">
                            {c.unreadCount} 条未读
                          </span>
                        )}
                      </div>
                      <Typography.Text type="secondary" className="wiselearn-conv-time">
                        {new Date(c.lastMessageAt).toLocaleString('zh-CN')}
                      </Typography.Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    )
  }

  if (otherId === user?.id) {
    return (
      <div>
        <Typography.Title level={4}>私信</Typography.Title>
        <Card className="wiselearn-card">
          <Typography.Paragraph type="secondary">
            不能给自己发私信。请从帖子中点击其他作者进入私信。
          </Typography.Paragraph>
        </Card>
      </div>
    )
  }

  return (
    <div className="wiselearn-chat">
      <div className="wiselearn-chat-header">
        <div className="wiselearn-chat-avatar">
          {(otherNickname || '?').charAt(0)}
        </div>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {otherNickname ?? '...'}
        </Typography.Title>
      </div>

      <div className="wiselearn-chat-messages">
        {loading ? (
          <div className="wiselearn-chat-loading">加载中...</div>
        ) : (
          messagesList.map((item) => {
            const isMe = item.from_user_id === user?.id
            return (
              <div
                key={item.id}
                className={`wiselearn-bubble-wrap ${isMe ? 'is-me' : ''}`}
              >
                <div className="wiselearn-bubble">
                  <div className="wiselearn-bubble-text">{item.content}</div>
                  <div className="wiselearn-bubble-time">
                    {new Date(item.created_at).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="wiselearn-chat-input-wrap">
        <Input.TextArea
          className="wiselearn-chat-input"
          placeholder="输入消息，按 Enter 发送"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              void onSend()
            }
          }}
          autoSize={{ minRows: 1, maxRows: 4 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => void onSend()}
          className="wiselearn-chat-send"
        >
          发送
        </Button>
      </div>
    </div>
  )
}
