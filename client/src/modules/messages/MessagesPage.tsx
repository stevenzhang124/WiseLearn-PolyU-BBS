import React, { useEffect, useState, useRef } from 'react'
import { Card, List, Input, Button, Typography, message, Badge, Tabs } from 'antd'
import { SendOutlined, LikeOutlined, UserAddOutlined, CommentOutlined, MessageOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import {
  fetchConversation,
  fetchConversationsList,
  sendMessage,
  getUserApi,
  getNotificationsLikes,
  getNotificationsFollows,
  getNotificationsComments,
  markNotificationsRead
} from '../shared/api'

import './MessagesPage.css'

type TabKey = 'likes' | 'follows' | 'comments' | 'dm'

/**
 * 消息中心（参考小红书）：点赞、关注、评论/回复 + 私信
 */
export const MessagesPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { userId: paramUserId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('likes')

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

  const [likesList, setLikesList] = useState<any[]>([])
  const [followsList, setFollowsList] = useState<any[]>([])
  const [commentsList, setCommentsList] = useState<any[]>([])
  const [loadingLikes, setLoadingLikes] = useState(false)
  const [loadingFollows, setLoadingFollows] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const otherId = paramUserId ? Number(paramUserId) : null
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  const TIME_GAP_MS = 5 * 60 * 1000

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

  useEffect(() => {
    if (otherId == null || Number.isNaN(otherId) || otherId <= 0 || otherId === user?.id) return
    const timer = setInterval(() => void loadConversation(otherId, true), 3000)
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
    if (activeTab === 'dm') void loadConversationsList()
  }, [activeTab])

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

  const loadLikes = async (markRead = false) => {
    setLoadingLikes(true)
    try {
      const data = await getNotificationsLikes({ mark_read: markRead })
      setLikesList(data.list)
    } catch (err) {
      message.error((err as Error).message)
      setLikesList([])
    } finally {
      setLoadingLikes(false)
    }
  }
  const loadFollows = async (markRead = false) => {
    setLoadingFollows(true)
    try {
      const data = await getNotificationsFollows({ mark_read: markRead })
      setFollowsList(data.list)
    } catch (err) {
      message.error((err as Error).message)
      setFollowsList([])
    } finally {
      setLoadingFollows(false)
    }
  }
  const loadComments = async (markRead = false) => {
    setLoadingComments(true)
    try {
      const data = await getNotificationsComments({ mark_read: markRead })
      setCommentsList(data.list)
    } catch (err) {
      message.error((err as Error).message)
      setCommentsList([])
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'likes') loadLikes()
  }, [activeTab])
  useEffect(() => {
    if (activeTab === 'follows') loadFollows()
  }, [activeTab])
  useEffect(() => {
    if (activeTab === 'comments') loadComments()
  }, [activeTab])

  const onTabChange = (key: string) => {
    const k = key as TabKey
    setActiveTab(k)
    if (k === 'dm') {
      if (otherId) { /* stay on /messages/:id */ } else navigate('/messages')
    } else {
      if (otherId) navigate('/messages')
      if (k === 'likes') markNotificationsRead('like').then(() => loadLikes(true)).catch(() => {})
      if (k === 'follows') markNotificationsRead('follow').then(() => loadFollows(true)).catch(() => {})
      if (k === 'comments') markNotificationsRead('comment').then(() => loadComments(true)).catch(() => {})
    }
  }

  useEffect(() => {
    if (paramUserId && Number(paramUserId) > 0) setActiveTab('dm')
  }, [paramUserId])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (otherId != null && !Number.isNaN(otherId) && otherId > 0 && otherId === user?.id) {
    return (
      <div>
        <Typography.Title level={4}>{t('messages.title')}</Typography.Title>
        <Card className="wiselearn-card">
          <Typography.Paragraph type="secondary">{t('messages.noSelfPM')}</Typography.Paragraph>
        </Card>
      </div>
    )
  }

  const renderLikes = () => (
    <div className="wiselearn-notif-list">
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('notifications.whoLiked')}
      </Typography.Title>
      {loadingLikes ? (
        <List loading />
      ) : likesList.length === 0 ? (
        <Typography.Paragraph type="secondary">{t('notifications.noLikes')}</Typography.Paragraph>
      ) : (
        <List
          dataSource={likesList}
          renderItem={(item) => (
            <List.Item
              className="wiselearn-notif-item"
              onClick={() => navigate(`/posts/${item.postId}`)}
              extra={
                <Button type="link" size="small">
                  {t('notifications.goToPost')}
                </Button>
              }
            >
              <div className="wiselearn-notif-item-inner">
                <Avatar src={item.actor.avatar} name={item.actor.nickname} size={44} className="wiselearn-conv-avatar" />
                <div className="wiselearn-notif-body">
                  <div className="wiselearn-conv-name">{item.actor.nickname}</div>
                  <Typography.Text type="secondary" className="wiselearn-notif-desc">
                    {t('notifications.likedYourPost', { title: item.postTitle })}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="wiselearn-notif-time">
                    {formatDate(item.createdAt)}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  const renderFollows = () => (
    <div className="wiselearn-notif-list">
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('notifications.whoFollowed')}
      </Typography.Title>
      {loadingFollows ? (
        <List loading />
      ) : followsList.length === 0 ? (
        <Typography.Paragraph type="secondary">{t('notifications.noFollows')}</Typography.Paragraph>
      ) : (
        <List
          dataSource={followsList}
          renderItem={(item) => (
            <List.Item
              className="wiselearn-notif-item"
              onClick={() => navigate(`/users/${item.actor.id}`)}
              extra={
                <Button type="link" size="small">{t('notifications.viewProfile')}</Button>
              }
            >
              <div className="wiselearn-notif-item-inner">
                <Avatar src={item.actor.avatar} name={item.actor.nickname} size={44} className="wiselearn-conv-avatar" />
                <div className="wiselearn-notif-body">
                  <div className="wiselearn-conv-name">{item.actor.nickname}</div>
                  <Typography.Text type="secondary" className="wiselearn-notif-desc">
                    {t('notifications.followedYou')}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="wiselearn-notif-time">
                    {formatDate(item.createdAt)}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  const renderComments = () => (
    <div className="wiselearn-notif-list">
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('notifications.whoCommented')}
      </Typography.Title>
      {loadingComments ? (
        <List loading />
      ) : commentsList.length === 0 ? (
        <Typography.Paragraph type="secondary">{t('notifications.noComments')}</Typography.Paragraph>
      ) : (
        <List
          dataSource={commentsList}
          renderItem={(item) => (
            <List.Item
              className="wiselearn-notif-item"
              onClick={() => navigate(`/posts/${item.postId}`)}
              extra={
                <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/posts/${item.postId}`) }}>
                  {t('notifications.goToPost')}
                </Button>
              }
            >
              <div className="wiselearn-notif-item-inner">
                <Avatar src={item.actor.avatar} name={item.actor.nickname} size={44} className="wiselearn-conv-avatar" />
                <div className="wiselearn-notif-body">
                  <div className="wiselearn-conv-name">{item.actor.nickname}</div>
                  <Typography.Text type="secondary" className="wiselearn-notif-desc">
                    {t('notifications.commentedOrReplied')}
                  </Typography.Text>
                  <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {item.content}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" className="wiselearn-notif-time">
                    {formatDate(item.createdAt)} · 《{item.postTitle}》
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  const renderDmList = () => (
    <div className="wiselearn-messages-list">
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('messages.conversationList')}
      </Typography.Title>
      {loadingList ? (
        <List loading />
      ) : conversations.length === 0 ? (
        <Typography.Paragraph type="secondary">{t('messages.noConversations')}</Typography.Paragraph>
      ) : (
        <List
          dataSource={conversations}
          renderItem={(c) => (
            <List.Item
              key={c.userId}
              className="wiselearn-conv-item"
              onClick={() => navigate(`/messages/${c.userId}`)}
              extra={c.unreadCount > 0 ? <Badge count={c.unreadCount} size="small" /> : null}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar src={c.avatar} name={c.nickname} size={44} className="wiselearn-conv-avatar" />
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
                    {new Date(c.lastMessageAt).toLocaleString(locale)}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  const renderChat = () => (
    <div className="wiselearn-chat">
      <div className="wiselearn-chat-header">
        <Avatar src={otherAvatar} name={otherNickname ?? ''} size={40} className="wiselearn-chat-avatar" />
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
                <div className={`wiselearn-bubble-wrap ${isMe ? 'is-me' : ''}`}>
                  {!isMe && (
                    <Avatar src={otherAvatar} name={otherNickname ?? ''} size={36} className="wiselearn-chat-msg-avatar" />
                  )}
                  <div className="wiselearn-bubble">
                    <div className="wiselearn-bubble-text">{item.content}</div>
                  </div>
                  {isMe && (
                    <Avatar src={user?.avatar} name={user?.nickname ?? ''} size={36} className="wiselearn-chat-msg-avatar" />
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
        <Button type="primary" icon={<SendOutlined />} onClick={() => void onSend()} className="wiselearn-chat-send">
          {t('messages.send')}
        </Button>
      </div>
    </div>
  )

  const isDmWithChat = otherId != null && !Number.isNaN(otherId) && otherId > 0

  return (
    <div className="wiselearn-message-center">
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        {t('notifications.title')}
      </Typography.Title>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        className="wiselearn-message-tabs"
        items={[
          {
            key: 'likes',
            label: (
              <span>
                <LikeOutlined /> {t('notifications.likes')}
              </span>
            ),
            children: <Card className="wiselearn-card">{renderLikes()}</Card>
          },
          {
            key: 'follows',
            label: (
              <span>
                <UserAddOutlined /> {t('notifications.follows')}
              </span>
            ),
            children: <Card className="wiselearn-card">{renderFollows()}</Card>
          },
          {
            key: 'comments',
            label: (
              <span>
                <CommentOutlined /> {t('notifications.comments')}
              </span>
            ),
            children: <Card className="wiselearn-card">{renderComments()}</Card>
          },
          {
            key: 'dm',
            label: (
              <span>
                <MessageOutlined /> {t('notifications.dm')}
              </span>
            ),
            children: (
              <Card className="wiselearn-card">
                {isDmWithChat ? (
                  renderChat()
                ) : (
                  renderDmList()
                )}
              </Card>
            )
          }
        ]}
      />
    </div>
  )
}
