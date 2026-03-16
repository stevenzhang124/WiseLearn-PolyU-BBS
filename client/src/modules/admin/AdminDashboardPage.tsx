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
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState<any[]>([])
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'

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
      message.success(pinned ? t('admin.pinSuccess') : t('admin.unpinSuccess'))
      await loadStats()
      await onSearch()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const onDelete = async (id: number) => {
    try {
      await deletePostAdmin(id)
      message.success(t('admin.deleteSuccess'))
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
          <Card loading={loading}>
            <Statistic
              title={t('admin.totalUsers')}
              value={stats?.totalUsers ?? 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('admin.totalPosts')}
              value={stats?.totalPosts ?? 0}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('admin.recentNewUsers')}>
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
          <Card title={t('admin.hotPostsTop10')}>
            <List
              dataSource={stats?.hotPostsTop10 ?? []}
              renderItem={(item: any) => (
                <List.Item key={item.id}>
                  <Space>
                    <span>#{item.id}</span>
                    <span>{item.title}</span>
                    <Tag color="blue">{t('admin.views')} {item.view_count}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('admin.postSearch')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search
                placeholder={t('admin.searchPlaceholder')}
                enterButton={t('admin.search')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={onSearch}
              />
              <Table
                rowKey="id"
                size="small"
                dataSource={searchResult}
                columns={[
                  { title: t('admin.id'), dataIndex: 'id', width: 60 },
                  { title: t('admin.title'), dataIndex: 'title' },
                  {
                    title: t('admin.views'),
                    dataIndex: 'view_count',
                    width: 80
                  },
                  {
                    title: t('post.likes'),
                    dataIndex: 'like_count',
                    width: 80
                  },
                  {
                    title: t('admin.time'),
                    dataIndex: 'created_at',
                    render: (v: string) =>
                      new Date(v).toLocaleString(locale),
                    width: 180
                  },
                  {
                    title: t('admin.actions'),
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
                          {record.is_pinned ? t('admin.unpin') : t('admin.pin')}
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => onDelete(record.id)}
                        >
                          {t('admin.delete')}
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

      <Card title={t('admin.dataDesc')}>
        <Descriptions column={1}>
          <Descriptions.Item label={t('admin.dataDescLabel')}>
            {t('admin.dataDescText')}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

