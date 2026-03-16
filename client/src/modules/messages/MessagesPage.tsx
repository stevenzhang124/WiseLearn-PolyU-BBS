import React, { useEffect, useState, useRef } from 'react'
import { Card, List, Input, Button, Typography, message, Badge } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
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
  const { t, i18n } = useTranslation()
  const { userId: paramUserId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [otherNickname, setOtherNickname] = useState<string | null>(null)
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [messagesList, setMessagesList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<
    Array<{ userId: number; nickname: string; avatar?: string | null; lastMessageAt: string; unreadCount: number }>
  >([])
  const [loadingList, setLoadingList] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const otherId = paramUserId ? Number(paramUserId) : null
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  const TIME_GAP_MS = 5 * 60 * 1000

  /** 是否应在该条消息前显示时间分隔（首条或与上条间隔超过 5 分钟） */
  const shouldShowTimeBefore = (index: number) => {
    if (index === 0) return true
    const prev = messagesList[index - 1]
    const curr = messagesList[index]
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() > TIME_GAP_MS
  }

  const formatTimeSep = (dateStr: string) =>
    new Date(dateStr).toLocaleString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const loadConversation = async (targetId: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [convRes, userRes] = await Promise.all([
        fetchConversation(targetId),
        getUserApi(targetId)
      ])
      setMessagesList(convRes.messages)
      setOtherNickname(userRes.nickname)
      setOtherAvatar(userRes.avatar ?? null)
    } catch (err) {
      if (!silent) message.error((err as Error).message)
      setOtherNickname(null)
      setOtherAvatar(null)
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
      setOtherAvatar(null)
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
      message.warning(t('messages.inputRequired'))
      return
    }
    if (otherId === user?.id) {
      message.warning(t('messages.noSelfSend'))
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
          {t('messages.title')}
        </Typography.Title>
        <Card className="wiselearn-card" title={t('messages.conversationList')}>
          {loadingList ? (
            <List loading />
          ) : conversations.length === 0 ? (
            <Typography.Paragraph type="secondary">
              {t('messages.noConversations')}
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
                    <Avatar
                      src={c.avatar}
                      name={c.nickname}
                      size={44}
                      className="wiselearn-conv-avatar"
                    />
                    <div className="wiselearn-conv-body">
                      <div className="wiselearn-conv-name">
                        {c.nickname}
                        {c.unreadCount > 0 && (
                          <span className="wiselearn-conv-unread">
                            {t('messages.unreadCount', { count: c.unreadCount })}
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
        <Typography.Title level={4}>{t('messages.title')}</Typography.Title>
        <Card className="wiselearn-card">
          <Typography.Paragraph type="secondary">
            {t('messages.noSelfPM')}
          </Typography.Paragraph>
        </Card>
      </div>
    )
  }

  return (
    <div className="wiselearn-chat">
      <div className="wiselearn-chat-header">
        <Avatar
          src={otherAvatar}
          name={otherNickname ?? ''}
          size={40}
          className="wiselearn-chat-avatar"
        />
        <Typography.Title level={5} style={{ margin: 0 }}>
          {otherNickname ?? '...'}
        </Typography.Title>
      </div>

      <div className="wiselearn-chat-messages">
        {loading ? (
          <div className="wiselearn-chat-loading">{t('messages.loading')}</div>
        ) : (
          messagesList.map((item, index) => {
            const isMe = item.from_user_id === user?.id
            return (
              <React.Fragment key={item.id}>
                {shouldShowTimeBefore(index) && (
                  <div className="wiselearn-chat-time-sep">
                    <span>{formatTimeSep(item.created_at)}</span>
                  </div>
                )}
                <div
                  className={`wiselearn-bubble-wrap ${isMe ? 'is-me' : ''}`}
                >
                  {!isMe && (
                    <Avatar
                      src={otherAvatar}
                      name={otherNickname ?? ''}
                      size={36}
                      className="wiselearn-chat-msg-avatar"
                    />
                  )}
                  <div className="wiselearn-bubble">
                    <div className="wiselearn-bubble-text">{item.content}</div>
                  </div>
                  {isMe && (
                    <Avatar
                      src={user?.avatar}
                      name={user?.nickname ?? ''}
                      size={36}
                      className="wiselearn-chat-msg-avatar"
                    />
                  )}
                </div>
              </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="wiselearn-chat-input-wrap">
        <Input.TextArea
          className="wiselearn-chat-input"
          placeholder={t('messages.inputPlaceholder')}
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
          {t('messages.send')}
        </Button>
      </div>
    </div>
  )
}
