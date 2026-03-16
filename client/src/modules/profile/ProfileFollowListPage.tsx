import React, { useEffect, useState } from 'react'
import { Card, List, Typography, message, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { getFollowingListApi, getFollowersListApi } from '../shared/api'
import './ProfilePage.css'

type ListType = 'following' | 'followers'

/**
 * 我的关注 / 我的粉丝 列表页
 */
export const ProfileFollowListPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const type: ListType = location.pathname.endsWith('/followers') ? 'followers' : 'following'
  const [list, setList] = useState<Array<{ id: number; nickname: string; avatar: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const api = type === 'following' ? getFollowingListApi : getFollowersListApi
    api(user.id)
      .then((data) => setList(data.list))
      .catch((err) => {
        message.error((err as Error).message)
        setList([])
      })
      .finally(() => setLoading(false))
  }, [user, type])

  const title = type === 'following' ? t('profile.followingList') : t('profile.followersList')
  const emptyText = type === 'following' ? t('profile.noFollowing') : t('profile.noFollowers')

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/profile')}
        style={{ marginBottom: 16 }}
      >
        {t('profile.backToProfile')}
      </Button>
      <Card title={title}>
        <List
          loading={loading}
          dataSource={list}
          locale={{ emptyText }}
          renderItem={(item) => (
            <List.Item
              className="wiselearn-profile-list-item"
              onClick={() => navigate(`/users/${item.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left' }}>
                <Avatar src={item.avatar} name={item.nickname} size={44} />
                <Typography.Text strong>{item.nickname}</Typography.Text>
              </div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
