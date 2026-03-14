import React, { useState } from 'react'
import { Button, Form, Input, Select, Card, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../shared/api'

const categories = [
  { label: '教学交流', value: 'teaching' },
  { label: '校园生活', value: 'campus' },
  { label: '求职分享', value: 'career' }
]

/**
 * 发帖页：单独页面，仅包含发帖表单
 */
export const CreatePostPage: React.FC = () => {
  const [form] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const onCreatePost = async (values: {
    title: string
    category: string
    content: string
    imageUrls?: string
  }) => {
    setCreating(true)
    try {
      const images = values.imageUrls
        ? values.imageUrls
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
      await createPost({
        title: values.title,
        category: values.category,
        content: values.content,
        imageUrls: images
      })
      message.success('发帖成功')
      form.resetFields()
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
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreatePost}
        >
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
            name="content"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={6} placeholder="请输入帖子内容，支持换行" />
          </Form.Item>
          <Form.Item
            label="图片地址（可选，多张用英文逗号分隔）"
            name="imageUrls"
          >
            <Input placeholder="https://example.com/a.jpg, https://example.com/b.jpg" />
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
