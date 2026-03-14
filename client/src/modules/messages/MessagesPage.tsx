import React, { useEffect, useState } from 'react'
import { Card, List, Input, Button, Space, message } from 'antd'
import { useAuth } from '../auth/AuthContext'
import { fetchConversation, sendMessage } from '../shared/api'

/**
 * 私信页面：简化为输入对方用户 ID 发私信，并查看与其的会话记录。
 * 实际项目中可扩展为按昵称搜索用户、展示会话列表等。
 */
export const MessagesPage: React.FC = () => {
  const { user } = useAuth()
  const [targetId, setTargetId] = useState<string>('')
  const [content, setContent] = useState('')
  const [messagesList, setMessagesList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadConversation = async (otherId: number) => {
    setLoading(true)
    try {
      const data = await fetchConversation(otherId)
      setMessagesList(data.messages)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const onSend = async () => {
    const toId = Number(targetId)
    if (!toId || !content.trim()) {
      message.warning('请输入收件人 ID 和内容')
      return
    }
    try {
      await sendMessage({ toUserId: toId, content })
      setContent('')
      message.success('发送成功')
      await loadConversation(toId)
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  useEffect(() => {
    const toId = Number(targetId)
    if (!Number.isNaN(toId) && toId > 0) {
      void loadConversation(toId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <Card title="私信会话" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <span>当前用户 ID：{user?.id}</span>
        </Space>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="对方用户 ID"
              style={{ width: 160 }}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
            <Input
              placeholder="输入私信内容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
                <span>
                  {item.from_user_id === user?.id ? '我' : `用户 ${item.from_user_id}`}
                  ：
                </span>
                <span>{item.content}</span>
                <span>
                  （{new Date(item.created_at).toLocaleString('zh-CN')}）
                </span>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

