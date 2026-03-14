import React, { useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Select,
  Tabs,
  List,
  Space,
  Tag,
  Typography,
  Pagination,
  message
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { createPost, fetchPosts } from '../shared/api'

const categories = [
  { label: '教学交流', value: 'teaching' },
  { label: '校园生活', value: 'campus' },
  { label: '求职分享', value: 'career' }
]

/**
 * 首页：发帖表单 + 帖子列表（分页 & 时间/热度排序）
 */
export const HomePage: React.FC = () => {
  const [form] = Form.useForm()
  const [tab, setTab] = useState<'time' | 'hot'>('time')
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [creating, setCreating] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const navigate = useNavigate()

  const loadPosts = async (pageNo = 1, sort: 'time' | 'hot' = tab) => {
    setLoadingPosts(true)
    try {
      const data = await fetchPosts({
        page: pageNo,
        pageSize,
        sort
      })
      setPosts(data.list)
      setTotal(data.pagination.total)
      setPage(pageNo)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    void loadPosts(1, tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

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
      void loadPosts(1, tab)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <Typography.Title level={3}>发帖</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onCreatePost}
        style={{ marginBottom: 32 }}
      >
        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input maxLength={100} showCount />
        </Form.Item>
        <Form.Item
          label="分类"
          name="category"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select options={categories} placeholder="请选择帖子分类" />
        </Form.Item>
        <Form.Item
          label="内容（支持基础富文本标记，如换行、简要格式，可后续替换为完整富文本编辑器）"
          name="content"
          rules={[{ required: true, message: '请输入内容' }]}
        >
          <Input.TextArea rows={5} />
        </Form.Item>
        <Form.Item
          label="图片地址（可选，多张图片用英文逗号分隔）"
          name="imageUrls"
        >
          <Input placeholder="https://example.com/a.jpg, https://example.com/b.jpg" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={creating}
          >
            发布帖子
          </Button>
        </Form.Item>
      </Form>

      <Space
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as 'time' | 'hot')}
          items={[
            { key: 'time', label: '按时间排序' },
            { key: 'hot', label: '按热度排序' }
          ]}
        />
      </Space>

      <List
        loading={loadingPosts}
        dataSource={posts}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/posts/${item.id}`)}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>{item.title}</span>
                  <Tag color="gold">
                    {categories.find((c) => c.value === item.category)?.label ??
                      item.category}
                  </Tag>
                  {item.is_pinned ? <Tag color="red">置顶</Tag> : null}
                </Space>
              }
              description={
                <Space size="large">
                  <span>作者：{item.author}</span>
                  <span>浏览：{item.view_count}</span>
                  <span>点赞：{item.like_count}</span>
                  <span>
                    时间：{new Date(item.created_at).toLocaleString('zh-CN')}
                  </span>
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={(p) => void loadPosts(p, tab)}
          showSizeChanger={false}
        />
      </div>
    </div>
  )
}

