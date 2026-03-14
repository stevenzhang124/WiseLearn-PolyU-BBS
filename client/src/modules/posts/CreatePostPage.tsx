import React, { useState } from 'react'
import { Button, Form, Input, Select, Card, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../shared/api'
import { RichTextEditor } from './RichTextEditor'

const categories = [
  { label: '教学交流', value: 'teaching' },
  { label: '校园生活', value: 'campus' },
  { label: '求职分享', value: 'career' }
]

/**
 * 发帖页：富文本编辑 + 图片上传
 */
export const CreatePostPage: React.FC = () => {
  const [form] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const [contentHtml, setContentHtml] = useState('')
  const navigate = useNavigate()

  const onCreatePost = async (values: {
    title: string
    category: string
  }) => {
    if (!contentHtml || contentHtml === '<p></p>') {
      message.warning('请输入帖子内容')
      return
    }
    setCreating(true)
    try {
      await createPost({
        title: values.title,
        category: values.category,
        content: contentHtml
      })
      message.success('发帖成功')
      form.resetFields()
      setContentHtml('')
      navigate('/')
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <Typography.Title level={3}>发帖</Typography.Title>
      <Card className="wiselearn-card">
        <Form form={form} layout="vertical" onFinish={onCreatePost}>
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input maxLength={100} showCount placeholder="请输入帖子标题" />
          </Form.Item>
          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select options={categories} placeholder="请选择帖子分类" />
          </Form.Item>
          <Form.Item
            label="内容"
            required
            help="支持加粗、列表、插入图片（粘贴或拖拽图片即可上传）"
          >
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="写点什么…"
              minHeight={260}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              发布帖子
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/')}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
