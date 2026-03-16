import React, { useEffect, useState } from 'react'
import { Button, Typography, message } from 'antd'
import { UserAddOutlined, MessageOutlined, UserOutlined, HeartOutlined, EyeOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import {
  getUserProfileApi,
  getUserPostsApi,
  followUserApi,
  unfollowUserApi
} from '../shared/api'
import './UserProfilePage.css'

function getFirstImageUrl(post: { content?: string; image_urls?: string | null }): string | null {
  if (post.image_urls) {
    const first = String(post.image_urls).split(',')[0]?.trim()
    if (first) return first
  }
  if (post.content && /<img[^>]+src=["']([^"']+)["']/.test(post.content)) {
    const m = post.content.match(/<img[^>]+src=["']([^"']+)["']/)
    return m ? m[1] : null
  }
  return null
}

/**
 * 用户公开资料页（小红书风格）：昵称、头像、发帖数/粉丝数/获赞数、关注/私信、其发布的帖子
 */
export const UserProfilePage: React.FC = () => {
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
        <div className="wiselearn-user-profile-loading">{t('common.loading')}</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="wiselearn-user-profile">
      <div className="wiselearn-user-profile-header">
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

      <div className="wiselearn-user-profile-posts">
        <Typography.Title level={5} style={{ marginBottom: 16 }}>
          {t('user.theirPosts')}
        </Typography.Title>
        {posts.length === 0 ? (
          <div className="wiselearn-user-profile-empty">{t('user.noPosts')}</div>
        ) : (
          <div className="wiselearn-user-profile-grid">
            {posts.map((item) => {
              const coverUrl = getFirstImageUrl(item)
              return (
                <div
                  key={item.id}
                  className="wiselearn-user-profile-card"
                  onClick={() => navigate(`/posts/${item.id}`)}
                >
                  <div className="wiselearn-user-profile-card-cover">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" />
                    ) : (
                      <div className="wiselearn-user-profile-card-placeholder" />
                    )}
                  </div>
                  <Typography.Paragraph
                    className="wiselearn-user-profile-card-title"
                    ellipsis={{ rows: 2 }}
                  >
                    {item.title}
                  </Typography.Paragraph>
                  <div className="wiselearn-user-profile-card-meta">
                    <HeartOutlined /> {item.like_count} · <EyeOutlined /> {item.view_count}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
