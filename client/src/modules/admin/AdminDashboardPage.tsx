import React, { useEffect, useState } from 'react'
import {
  Card,
  Col,
  Descriptions,
  Input,
  List,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Button,
  message
} from 'antd'
import {
  fetchAdminStats,
  searchAdminPosts,
  pinPost,
  deletePostAdmin
} from '../shared/api'

/**
 * 管理后台：展示统计数据 + 热门帖子 + 帖子搜索/置顶/删除
 */
export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState<any[]>([])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await fetchAdminStats()
      setStats(data)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  const onSearch = async () => {
    try {
      const data = await searchAdminPosts(keyword)
      setSearchResult(data.list)
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const onPinToggle = async (id: number, pinned: boolean) => {
    try {
      await pinPost(id, pinned)
      message.success(pinned ? '已置顶' : '已取消置顶')
      await loadStats()
      await onSearch()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const onDelete = async (id: number) => {
    try {
      await deletePostAdmin(id)
      message.success('帖子已删除')
      await loadStats()
      await onSearch()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats?.totalUsers ?? 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总帖子数"
              value={stats?.totalPosts ?? 0}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近 7 天新增用户">
            <Space>
              {(stats?.dailyNewUsers ?? []).map((item: any) => (
                <Tag key={item.date}>
                  {item.date} +{item.count}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="热门帖子 TOP10（按浏览量）">
            <List
              dataSource={stats?.hotPostsTop10 ?? []}
              renderItem={(item: any) => (
                <List.Item key={item.id}>
                  <Space>
                    <span>#{item.id}</span>
                    <span>{item.title}</span>
                    <Tag color="blue">浏览 {item.view_count}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="帖子搜索与管理">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search
                placeholder="输入帖子标题或正文关键词"
                enterButton="搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={onSearch}
              />
              <Table
                rowKey="id"
                size="small"
                dataSource={searchResult}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 60 },
                  { title: '标题', dataIndex: 'title' },
                  {
                    title: '浏览',
                    dataIndex: 'view_count',
                    width: 80
                  },
                  {
                    title: '点赞',
                    dataIndex: 'like_count',
                    width: 80
                  },
                  {
                    title: '时间',
                    dataIndex: 'created_at',
                    render: (v: string) =>
                      new Date(v).toLocaleString('zh-CN'),
                    width: 180
                  },
                  {
                    title: '操作',
                    key: 'actions',
                    width: 200,
                    render: (_: any, record: any) => (
                      <Space>
                        <Button
                          size="small"
                          onClick={() =>
                            onPinToggle(record.id, !record.is_pinned)
                          }
                        >
                          {record.is_pinned ? '取消置顶' : '置顶'}
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => onDelete(record.id)}
                        >
                          删除
                        </Button>
                      </Space>
                    )
                  }
                ]}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="数据说明">
        <Descriptions column={1}>
          <Descriptions.Item label="统计说明">
            本页面展示 WiseLearn 平台核心数据概览，帮助管理员了解站点活跃度和内容质量。
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

