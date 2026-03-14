import React, { useEffect, useState } from 'react'
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
import { useAuth } from '../auth/AuthContext'
import { getActivities, updateNicknameApi } from '../shared/api'

/**
 * 个人中心：显示基本信息 + 修改昵称 + 发帖 / 评论 / 点赞记录
 */
export const ProfilePage: React.FC = () => {
  const { user, refreshMe } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
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
      message.success('昵称已更新')
      await refreshMe()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  return (
    <div>
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="邮箱">
            {user?.email}
          </Descriptions.Item>
          <Descriptions.Item label="身份">
            {user?.isAdmin ? '管理员' : '普通用户'}
          </Descriptions.Item>
        </Descriptions>
        <Form
          form={form}
          layout="inline"
          onFinish={onUpdateNickname}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="昵称"
            name="nickname"
            rules={[
              { required: true, message: '请输入昵称' },
              {
                pattern: /^[\u4e00-\u9fa5A-Za-z0-9]{2,20}$/,
                message: '2-20 位中英文或数字，禁止特殊符号'
              }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              更新昵称
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'posts',
              label: '我的发帖',
              children: (
                <List
                  loading={loading}
                  dataSource={activities.posts}
                  renderItem={(item) => (
                    <List.Item key={item.id}>
                      {item.title}（{new Date(
                        item.created_at
                      ).toLocaleString('zh-CN')}
                      ）
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'comments',
              label: '我的评论',
              children: (
                <List
                  loading={loading}
                  dataSource={activities.comments}
                  renderItem={(item) => (
                    <List.Item key={item.id}>
                      在《{item.post_title}》中评论：{item.content}（
                      {new Date(item.created_at).toLocaleString('zh-CN')}）
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'likes',
              label: '我的点赞',
              children: (
                <List
                  loading={loading}
                  dataSource={activities.likes}
                  renderItem={(item) => (
                    <List.Item key={item.id}>
                      点赞了《{item.post_title}》 （
                      {new Date(item.created_at).toLocaleString('zh-CN')}）
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

