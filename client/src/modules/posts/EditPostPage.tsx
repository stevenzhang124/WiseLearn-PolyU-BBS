import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Select, Card, Typography, message } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchPostDetail, updatePost } from '../shared/api'
import { uploadImageApi } from '../shared/api'
import { useAuth } from '../auth/AuthContext'
import { RichTextEditor } from './RichTextEditor'
import { generateTitleCoverFile } from './generateTitleCover'

const categoryValues = [
  { value: 'teaching' },
  { value: 'campus' },
  { value: 'career' }
]

/**
 * 编辑帖子页：仅作者可访问，加载后可修改标题/分类/内容并重新发布
 */
export const EditPostPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const postId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [contentHtml, setContentHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!postId || Number.isNaN(postId)) {
      navigate('/')
      return
    }
    let cancelled = false
    fetchPostDetail(postId)
      .then((data) => {
        if (cancelled) return
        const post = data?.post
        if (!post) {
          message.error(t('post.invalidId'))
          navigate('/')
          return
        }
        if (post.user_id !== user?.id) {
          message.warning(t('post.editNotAuthor'))
          navigate(`/posts/${postId}`)
          return
        }
        form.setFieldsValue({
          title: post.title,
          category: post.category
        })
        setContentHtml(post.content || '')
      })
      .catch((err) => {
        if (!cancelled) {
          message.error((err as Error).message)
          navigate('/')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [postId, user?.id, form, navigate, t])

  const categories = categoryValues.map((c) => ({
    label: t(`home.category.${c.value}` as const),
    value: c.value
  }))

  const onSave = async (values: { title: string; category: string }) => {
    if (!contentHtml || contentHtml === '<p></p>') {
      message.warning(t('post.contentRequired'))
      return
    }
    setSaving(true)
    try {
      const hasImages = /<img\\b[^>]*>/i.test(contentHtml)
      let imageUrls: string[] | undefined = undefined

      // 如果正文没有图片，则生成“标题封面图”并作为 image_urls
      if (!hasImages) {
        const coverFile = await generateTitleCoverFile(values.title)
        const { url } = await uploadImageApi(coverFile)
        imageUrls = [url]
      }

      await updatePost(postId, {
        title: values.title,
        category: values.category,
        content: contentHtml,
        imageUrls
      })
      message.success(t('post.updateSuccess'))
      navigate(`/posts/${postId}`)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="wiselearn-card" loading>
        <Typography.Paragraph>{t('common.loading')}</Typography.Paragraph>
      </Card>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>{t('post.edit')}</Typography.Title>
      <Card className="wiselearn-card">
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item
            label={t('post.title')}
            name="title"
            rules={[{ required: true, message: t('post.titleRequired') }]}
          >
            <Input maxLength={100} showCount placeholder={t('post.titlePlaceholder')} />
          </Form.Item>
          <Form.Item
            label={t('post.category')}
            name="category"
            rules={[{ required: true, message: t('post.categoryRequired') }]}
          >
            <Select options={categories} placeholder={t('post.categoryPlaceholder')} />
          </Form.Item>
          <Form.Item
            label={t('post.content')}
            required
            help={t('post.contentHelp')}
          >
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder={t('post.contentPlaceholder')}
              minHeight={260}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              {t('post.saveUpdate')}
            </Button>
            <Button
              style={{ marginLeft: 8 }}
              onClick={() => navigate(`/posts/${postId}`)}
            >
              {t('post.cancel')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
