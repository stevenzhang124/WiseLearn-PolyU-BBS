import React, { useEffect, useRef, useState } from 'react'
import {
  Card,
  Descriptions,
  Form,
  Input,
  Button,
  Tabs,
  List,
  message
} from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../shared/Avatar'
import { getActivities, updateNicknameApi, uploadAvatarApi } from '../shared/api'
import './ProfilePage.css'

/**
 * 个人中心：显示基本信息 + 修改昵称 + 发帖 / 评论 / 点赞记录
 */
export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, refreshMe } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activities, setActivities] = useState<{
    posts: any[]
    comments: any[]
    likes: any[]
  }>({ posts: [], comments: [], likes: [] })

  const loadActivities = async () => {
    setLoading(true)
    try {
      const data = await getActivities()
      setActivities(data)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      form.setFieldsValue({ nickname: user.nickname })
      void loadActivities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const onUpdateNickname = async (values: { nickname: string }) => {
    try {
      await updateNicknameApi(values.nickname)
      message.success(t('profile.updateSuccess'))
      await refreshMe()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
      message.warning(t('profile.avatarFormat'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.warning(t('profile.avatarSize'))
      return
    }
    setUploadingAvatar(true)
    try {
      await uploadAvatarApi(file)
      message.success(t('profile.avatarSuccess'))
      await refreshMe()
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  return (
    <div>
      <Card title={t('profile.basicInfo')} style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={onAvatarChange}
          />
          <span
            style={{ cursor: uploadingAvatar ? 'wait' : 'pointer' }}
            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Avatar src={user?.avatar} name={user?.nickname ?? ''} size={72} />
          </span>
          <div>
            <Button
              type="primary"
              loading={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingAvatar ? t('profile.uploading') : t('profile.uploadAvatar')}
            </Button>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
              {t('profile.avatarHint')}
            </span>
          </div>
        </div>
        <Descriptions column={1}>
          <Descriptions.Item label={t('profile.email')}>
            {user?.email}
          </Descriptions.Item>
          <Descriptions.Item label={t('profile.role')}>
            {user?.isAdmin ? t('profile.roleAdmin') : t('profile.roleUser')}
          </Descriptions.Item>
        </Descriptions>
        <Form
          form={form}
          layout="inline"
          onFinish={onUpdateNickname}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('profile.nickname')}
            name="nickname"
            rules={[
              { required: true, message: t('auth.nicknameRequired') },
              {
                pattern: /^[\u4e00-\u9fa5A-Za-z0-9]{2,20}$/,
                message: t('auth.nicknameInvalid')
              }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t('profile.updateNickname')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="wiselearn-profile-activity-card">
        <Tabs
          items={[
            {
              key: 'posts',
              label: t('profile.myPosts'),
              children: (
                <List
                  loading={loading}
                  dataSource={activities.posts}
                  className="wiselearn-profile-list"
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      className="wiselearn-profile-list-item"
                      onClick={() => navigate(`/posts/${item.id}`)}
                    >
                      <span className="wiselearn-profile-list-text">
                        {item.title}（{new Date(item.created_at).toLocaleString(locale)}）
                      </span>
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'comments',
              label: t('profile.myComments'),
              children: (
                <List
                  loading={loading}
                  dataSource={activities.comments}
                  className="wiselearn-profile-list"
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      className="wiselearn-profile-list-item"
                      onClick={() => navigate(`/posts/${item.post_id}`)}
                    >
                      <span className="wiselearn-profile-list-text">
                        {t('profile.commentedIn', { title: item.post_title, content: item.content })}（
                        {new Date(item.created_at).toLocaleString(locale)}）
                      </span>
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'likes',
              label: t('profile.myLikes'),
              children: (
                <List
                  loading={loading}
                  dataSource={activities.likes}
                  className="wiselearn-profile-list"
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      className="wiselearn-profile-list-item"
                      onClick={() => navigate(`/posts/${item.post_id}`)}
                    >
                      <span className="wiselearn-profile-list-text">
                        {t('profile.likedPost', { title: item.post_title })} （
                        {new Date(item.created_at).toLocaleString(locale)}）
                      </span>
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

