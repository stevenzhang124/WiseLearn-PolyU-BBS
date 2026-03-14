import React, { useEffect, useState } from 'react'
import {
  Tabs,
  List,
  Space,
  Tag,
  Typography,
  Pagination,
  message
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { fetchPosts } from '../shared/api'

const categories = [
  { label: '教学交流', value: 'teaching' },
  { label: '校园生活', value: 'campus' },
  { label: '求职分享', value: 'career' }
]

/**
 * 首页：仅展示当前所有帖子列表（分页 + 按时间/热度排序）
 */
export const HomePage: React.FC = () => {
  const [tab, setTab] = useState<'time' | 'hot'>('time')
  const [loadingPosts, setLoadingPosts] = useState(false)
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
  }, [tab])

  return (
    <div>
      <Typography.Title level={3}>帖子列表</Typography.Title>

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
