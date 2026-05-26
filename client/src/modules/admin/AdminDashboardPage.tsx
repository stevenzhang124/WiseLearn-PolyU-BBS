import React, { useEffect, useRef, useState } from 'react'
import {
  App,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Button,
  Modal
} from 'antd'
import { useTranslation } from 'react-i18next'
import {
  fetchAdminStats,
  searchAdminPosts,
  pinPost,
  deletePostAdmin,
  fetchAdminPendingPosts,
  approvePostAdmin,
  rejectPostAdmin,
  fetchSensitiveWords,
  addSensitiveWord,
  deleteSensitiveWord,
  fetchAdminUsers,
  blockAdminUser
} from '../shared/api'
import './AdminDashboardPage.css'

/**
 * 管理后台：展示统计数据 + 热门帖子 + 帖子搜索/置顶/删除
 */
export const AdminDashboardPage: React.FC = () => {
  const { message } = App.useApp()
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pendingPosts, setPendingPosts] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const pendingCountRef = useRef(0)
  const initializedPendingRef = useRef(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectPostId, setRejectPostId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [sensitiveWords, setSensitiveWords] = useState<any[]>([])
  const [newSensitiveWord, setNewSensitiveWord] = useState('')
  const [sensitiveLoading, setSensitiveLoading] = useState(false)
  const [userPanelOpen, setUserPanelOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [userKeyword, setUserKeyword] = useState('')
  const [userLoading, setUserLoading] = useState(false)
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'

  const ADMIN_PENDING_CHANGED_EVENT = 'wiselearn:admin-pending-changed'
  const notifyAdminPendingChanged = () => {
    window.dispatchEvent(new Event(ADMIN_PENDING_CHANGED_EVENT))
  }

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

  const loadPending = async (silent = false) => {
    if (!silent) setPendingLoading(true)
    try {
      const data = await fetchAdminPendingPosts()
      const list = data.list ?? []
      setPendingPosts(list)

      if (!initializedPendingRef.current) {
        pendingCountRef.current = list.length
        initializedPendingRef.current = true
      } else if (list.length > pendingCountRef.current) {
        message.warning(t('admin.pendingNew', { count: list.length - pendingCountRef.current }))
        pendingCountRef.current = list.length
      } else {
        pendingCountRef.current = list.length
      }
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      if (!silent) setPendingLoading(false)
    }
  }

  const loadSensitiveWords = async () => {
    setSensitiveLoading(true)
    try {
      const data = await fetchSensitiveWords()
      setSensitiveWords(data.list ?? [])
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setSensitiveLoading(false)
    }
  }

  const loadUsers = async (keyword = '') => {
    setUserLoading(true)
    try {
      const data = await fetchAdminUsers({ keyword, limit: 100, offset: 0 })
      setUsers(data.list ?? [])
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    if (!userPanelOpen) return
    void loadUsers(userKeyword)
  }, [userPanelOpen])

  useEffect(() => {
    void loadPending(false)
    void loadSensitiveWords()
    void loadUsers()
  }, [])

  // 后台定时轮询待审核数量：用于提示“新帖子需要审核”
  useEffect(() => {
    const timer = setInterval(() => void loadPending(true), 30000)
    return () => clearInterval(timer)
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

  const onApprove = async (id: number) => {
    try {
      await approvePostAdmin(id)
      message.success(t('admin.approveSuccess'))
      await loadPending()
      await loadStats()
      notifyAdminPendingChanged()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const openReject = (id: number) => {
    setRejectPostId(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const confirmReject = async () => {
    if (!rejectPostId) return
    if (!rejectReason.trim()) {
      message.warning(t('admin.reasonRequired'))
      return
    }
    try {
      await rejectPostAdmin(rejectPostId, rejectReason.trim())
      message.success(t('admin.rejectSuccess'))
      setRejectModalOpen(false)
      setRejectPostId(null)
      setRejectReason('')
      await loadPending()
      await loadStats()
      notifyAdminPendingChanged()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const addWord = async () => {
    const word = newSensitiveWord.trim()
    if (!word) {
      message.warning(t('admin.reasonRequired'))
      return
    }
    try {
      await addSensitiveWord(word)
      message.success(t('admin.sensitiveWordsAdded'))
      setNewSensitiveWord('')
      await loadSensitiveWords()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const removeWord = async (id: number) => {
    try {
      await deleteSensitiveWord(id)
      message.success(t('admin.sensitiveWordsRemoved'))
      await loadSensitiveWords()
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  const toggleUserBlock = async (id: number, blocked: boolean) => {
    try {
      await blockAdminUser(id, blocked)
      message.success(blocked ? t('admin.ban') : t('admin.unban'))
      await loadUsers(userKeyword)
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            loading={loading}
            className="wiselearn-admin-card wiselearn-admin-card--clickable"
            onClick={() => setUserPanelOpen(true)}
            hoverable
          >
            <Statistic
              title={t('admin.totalUsers')}
              value={stats?.totalUsers ?? 0}
            />
            <div className="wiselearn-admin-card__hint">
              {t('admin.userSearchHint')}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="wiselearn-admin-card">
            <Statistic
              title={t('admin.totalPosts')}
              value={stats?.totalPosts ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t('admin.recentNewUsers')} className="wiselearn-admin-card">
            <Space wrap>
              {(stats?.dailyNewUsers ?? []).map((item: any) => (
                <Tag key={item.date}>
                  {item.date} +{item.count}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title={t('admin.hotPostsTop10')} className="wiselearn-admin-card">
            <div className="wiselearn-admin-hot-list">
              {(stats?.hotPostsTop10 ?? []).map((item: any) => (
                <div key={item.id} className="wiselearn-admin-hot-row">
                  <Space wrap>
                    <span>#{item.id}</span>
                    <span>{item.title}</span>
                    <Tag color="blue">
                      {t('admin.views')} {item.view_count}
                    </Tag>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t('admin.postSearch')} className="wiselearn-admin-card">
            <Space orientation="vertical" style={{ width: '100%' }}>
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
                scroll={{ x: 600 }}
                columns={[
                  { title: t('admin.id'), dataIndex: 'id', width: 60 },
                  { title: t('admin.title'), dataIndex: 'title', ellipsis: true },
                  {
                    title: t('admin.views'),
                    dataIndex: 'view_count',
                    width: 70
                  },
                  {
                    title: t('post.likes'),
                    dataIndex: 'like_count',
                    width: 70
                  },
                  {
                    title: t('admin.time'),
                    dataIndex: 'created_at',
                    render: (v: string) =>
                      new Date(v).toLocaleString(locale),
                    width: 160,
                    responsive: ['md'] as any
                  },
                  {
                    title: t('admin.actions'),
                    key: 'actions',
                    width: 140,
                    fixed: 'right' as const,
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

      <Card title={t('admin.pendingPostsTitle')} className="wiselearn-admin-card" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          loading={pendingLoading}
          size="small"
          dataSource={pendingPosts}
          scroll={{ x: 700 }}
          columns={[
            { title: t('admin.id'), dataIndex: 'id', width: 60 },
            { title: t('admin.title'), dataIndex: 'title', ellipsis: true },
            { title: t('post.author'), dataIndex: 'author', width: 120 },
            {
              title: t('admin.time'),
              dataIndex: 'created_at',
              width: 160,
              responsive: ['md'] as any,
              render: (v: string) => new Date(v).toLocaleString(locale)
            },
            {
              title: t('admin.reason'),
              dataIndex: 'audit_reason',
              width: 240,
              responsive: ['lg'] as any,
              render: (v: string | null) =>
                v ? <Tag color={String(v).includes('敏感') ? 'volcano' : 'gold'}>{v}</Tag> : '--'
            },
            {
              title: t('admin.actions'),
              key: 'actions',
              width: 160,
              fixed: 'right' as const,
              render: (_: any, record: any) => (
                <Space>
                  <Button size="small" onClick={() => onApprove(record.id)}>
                    {t('admin.approve')}
                  </Button>
                  <Button size="small" danger onClick={() => openReject(record.id)}>
                    {t('admin.reject')}
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title={t('admin.dataDesc')} className="wiselearn-admin-card">
            <Descriptions column={1}>
              <Descriptions.Item label={t('admin.dataDescLabel')}>
                {t('admin.dataDescText')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t('admin.sensitiveWordsTitle')} className="wiselearn-admin-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={newSensitiveWord}
                  onChange={(e) => setNewSensitiveWord(e.target.value)}
                  placeholder={t('admin.sensitiveWordsPlaceholder')}
                  onPressEnter={() => void addWord()}
                />
                <Button type="primary" onClick={() => void addWord()}>
                  {t('admin.sensitiveWordsAdd')}
                </Button>
              </Space.Compact>
              <Table
                rowKey="id"
                size="small"
                loading={sensitiveLoading}
                dataSource={sensitiveWords}
                locale={{ emptyText: t('admin.sensitiveWordsEmpty') }}
                pagination={false}
                columns={[
                  { title: t('admin.title'), dataIndex: 'word', ellipsis: true },
                  {
                    title: t('admin.actions'),
                    key: 'actions',
                    width: 100,
                    render: (_: any, record: any) => (
                      <Button size="small" danger onClick={() => void removeWord(record.id)}>
                        {t('admin.delete')}
                      </Button>
                    )
                  }
                ]}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        open={rejectModalOpen}
        title={t('admin.reject')}
        okText={t('admin.submitAudit')}
        cancelText={t('post.cancel')}
        onCancel={() => setRejectModalOpen(false)}
        onOk={confirmReject}
        destroyOnHidden
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('admin.reasonPlaceholder')}
        />
      </Modal>

      <Modal
        open={userPanelOpen}
        title={t('admin.userManagementTitle')}
        onCancel={() => setUserPanelOpen(false)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.Search
            placeholder={t('admin.userSearchPlaceholder')}
            enterButton={t('admin.userSearch')}
            value={userKeyword}
            onChange={(e) => setUserKeyword(e.target.value)}
            onSearch={(v) => void loadUsers(v)}
          />
          <Table
            rowKey="id"
            size="small"
            loading={userLoading}
            dataSource={users}
            locale={{ emptyText: t('admin.userSearchHint') }}
            columns={[
              { title: t('admin.id'), dataIndex: 'id', width: 60 },
              { title: t('profile.nickname'), dataIndex: 'nickname' },
              { title: t('auth.email'), dataIndex: 'email', ellipsis: true },
              { title: t('profile.role'), dataIndex: 'role', width: 100 },
              {
                title: t('admin.time'),
                dataIndex: 'created_at',
                width: 160,
                render: (v: string) => new Date(v).toLocaleString(locale)
              },
              {
                title: t('admin.actions'),
                key: 'actions',
                width: 200,
                render: (_: any, record: any) => (
                  <Space>
                    <Button size="small" onClick={() => void toggleUserBlock(record.id, !record.is_blocked)}>
                      {record.is_blocked ? t('admin.unban') : t('admin.ban')}
                    </Button>
                    <Tag color={record.is_blocked ? 'red' : 'green'}>
                      {record.is_blocked ? t('admin.ban') : t('admin.unban')}
                    </Tag>
                  </Space>
                )
              }
            ]}
          />
        </Space>
      </Modal>
    </div>
  )
}

