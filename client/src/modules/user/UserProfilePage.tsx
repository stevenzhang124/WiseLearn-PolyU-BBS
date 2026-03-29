import React, { useEffect, useState } from 'react'
import { App, Button, Typography } from 'antd'
import { UserAddOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { FeedPostItem } from '../home/FeedPostItem'
import {
  getUserProfileApi,
  getUserPostsApi,
  followUserApi,
  unfollowUserApi
} from '../shared/api'
import './UserProfilePage.css'

/**
 * 用户公开资料页：顶部信息 + 微博样式帖子列表（复用首页 FeedPostItem）
 */
export const UserProfilePage: React.FC = () => {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const userId = id ? Number(id) : 0
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  const isSelf = user?.id === userId

  useEffect(() => {
    if (!userId || Number.isNaN(userId)) {
      navigate('/')
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([getUserProfileApi(userId), getUserPostsApi(userId)])
      .then(([prof, postsRes]) => {
        if (cancelled) return
        setProfile(prof)
        setPosts(postsRes.list || [])
      })
      .catch((err) => {
        if (!cancelled) message.error((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, navigate])

  const refreshProfile = () => {
    if (!userId) return
    getUserProfileApi(userId).then(setProfile).catch(() => {})
  }

  const onFollowToggle = async () => {
    if (!userId || isSelf) return
    setFollowLoading(true)
    try {
      if (profile?.isFollowing) {
        await unfollowUserApi(userId)
        message.success(t('user.unfollowSuccess'))
      } else {
        await followUserApi(userId)
        message.success(t('user.followSuccess'))
      }
      refreshProfile()
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="wiselearn-user-profile">
        <div className="wiselearn-user-profile-loading wiselearn-feed-card-frame">{t('common.loading')}</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="wiselearn-user-profile">
      <div className="wiselearn-user-profile-header wiselearn-feed-card-frame wiselearn-feed-card-frame--interactive">
        <Avatar
          src={profile.avatar}
          name={profile.nickname}
          size={80}
          className="wiselearn-user-profile-avatar"
        />
        <div className="wiselearn-user-profile-info">
          <Typography.Title level={4} style={{ margin: 0 }}>
            {profile.nickname}
            {isSelf && <span className="wiselearn-user-profile-self">{t('user.selfLabel')}</span>}
          </Typography.Title>
          <div className="wiselearn-user-profile-stats">
            <span><strong>{profile.postCount}</strong> {t('user.posts')}</span>
            <span><strong>{profile.followerCount}</strong> {t('user.followers')}</span>
            <span><strong>{profile.totalLikes}</strong> {t('user.likesReceived')}</span>
          </div>
          {!isSelf && user && (
            <div className="wiselearn-user-profile-actions">
              <Button
                type="primary"
                icon={profile.isFollowing ? <UserOutlined /> : <UserAddOutlined />}
                loading={followLoading}
                onClick={onFollowToggle}
                className="wiselearn-user-profile-follow-btn"
              >
                {profile.isFollowing ? t('user.unfollow') : t('user.follow')}
              </Button>
              <Button
                icon={<MessageOutlined />}
                onClick={() => navigate(`/messages/${userId}`)}
              >
                {t('user.message')}
              </Button>
            </div>
          )}
          {isSelf && (
            <Button type="primary" onClick={() => navigate('/profile')}>
              {t('user.editProfile')}
            </Button>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="wiselearn-user-profile-empty wiselearn-feed-card-frame">{t('user.noPosts')}</div>
      ) : (
        <div className="wiselearn-user-profile-feed wiselearn-feed-list">
          {posts.map((item) => (
            <FeedPostItem
              key={item.id}
              headerMode="timeOnly"
              post={{
                id: item.id,
                title: item.title,
                content: item.content ?? '',
                author: item.author,
                author_avatar: item.author_avatar ?? null,
                user_id: item.user_id ?? userId,
                like_count: item.like_count ?? 0,
                view_count: item.view_count ?? 0,
                image_urls: item.image_urls,
                created_at: item.created_at,
                  is_pinned: item.is_pinned,
                  category: item.category ?? 'campus',
                  user_liked: Boolean(item.user_liked)
                }}
              onNavigate={(path) => navigate(path)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
