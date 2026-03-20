import React, { useState } from 'react'
import { Button, Form, Input, Select, Card, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPost, uploadImageApi } from '../shared/api'
import { RichTextEditor } from './RichTextEditor'
import { generateTitleCoverFile } from './generateTitleCover'

/**
 * 发帖页：富文本编辑 + 图片上传
 */
const categoryValues = [
  { value: 'teaching' },
  { value: 'campus' },
  { value: 'career' },
  { value: 'news' },
  { value: 'mutual' }
]

export const CreatePostPage: React.FC = () => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const [contentHtml, setContentHtml] = useState('')
  const navigate = useNavigate()

  const categories = categoryValues.map((c) => ({
    label: t(`home.category.${c.value}` as const),
    value: c.value
  }))

  const onCreatePost = async (values: {
    title: string
    category: string
  }) => {
    if (!contentHtml || contentHtml === '<p></p>') {
      message.warning(t('post.contentRequired'))
      return
    }
    setCreating(true)
    try {
      const hasImages = /<img\\b[^>]*>/i.test(contentHtml)
      let imageUrls: string[] | undefined = undefined

      // 如果正文没有图片，则生成“标题封面图”并作为 image_urls
      if (!hasImages) {
        const coverFile = await generateTitleCoverFile(values.title)
        const { url } = await uploadImageApi(coverFile)
        imageUrls = [url]
      }

      await createPost({
        title: values.title,
        category: values.category,
        content: contentHtml,
        imageUrls
      })
      message.success(t('post.createSuccess'))
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
      <Typography.Title level={3}>{t('post.create')}</Typography.Title>
      <Card className="wiselearn-card">
        <Form form={form} layout="vertical" onFinish={onCreatePost}>
          <Form.Item
            label={t('post.title')}
            name="title"
            rules={[
              { required: true, message: t('post.titleRequired') },
              { max: 20, message: t('auth.titleTooLong') }
            ]}
          >
            <Input maxLength={20} showCount placeholder={t('post.titlePlaceholder')} />
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
            <Button type="primary" htmlType="submit" loading={creating}>
              {t('post.publish')}
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/')}>
              {t('post.cancel')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
