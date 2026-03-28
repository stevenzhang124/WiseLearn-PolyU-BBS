import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Select, Typography, message } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchPostDetail, updatePost, uploadImageApi } from '../shared/api'
import { useAuth } from '../auth/AuthContext'
import { RichTextEditor } from './RichTextEditor'
import type { RichTextEditorRef } from './RichTextEditor'
import { EditorToolbar } from './EditorToolbar'
import { generateTitleCoverFile } from './generateTitleCover'
import { extractImageUrlsFromContent } from './extractImageUrlsFromContent'
import { POST_CATEGORY_VALUES } from './postCategoryValues'
import './PostEditorPage.css'

/**
 * 编辑帖子页：布局与发帖页共用 PostEditorPage.css，仅数据加载与提交逻辑不同
 */
export const EditPostPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const postId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [contentHtml, setContentHtml] = useState('')
  const [titleValue, setTitleValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<RichTextEditorRef>(null)

  const handleEditorReady = useCallback(() => {
    setEditorReady(true)
  }, [])

  const categories = POST_CATEGORY_VALUES.map((value) => ({
    label: t(`home.category.${value}` as const),
    value
  }))

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
        setTitleValue(post.title || '')
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
    return () => {
      cancelled = true
    }
  }, [postId, user?.id, form, navigate, t])

  const onSave = async (values: { title: string; category: string }) => {
    if (!contentHtml || contentHtml === '<p></p>') {
      message.warning(t('post.contentRequired'))
      return
    }
    setSaving(true)
    try {
      const fromContent = extractImageUrlsFromContent(contentHtml)
      let imageUrls: string[]

      if (fromContent.length > 0) {
        imageUrls = fromContent
      } else {
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
      <div className="wiselearn-post-editor">
        <div className="wiselearn-post-editor-body">
          <Typography.Text type="secondary">{t('common.loading')}</Typography.Text>
        </div>
      </div>
    )
  }

  return (
    <div className="wiselearn-post-editor">
      <div className="wiselearn-post-editor-body">
        <Typography.Title level={4} className="wiselearn-post-editor-heading">
          {t('post.edit')}
        </Typography.Title>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item
            label={t('post.title')}
            name="title"
            rules={[
              { required: true, message: t('post.titleRequired') },
              { max: 20, message: t('auth.titleTooLong') }
            ]}
          >
            <div className="wiselearn-input-wrapper">
              <Input
                maxLength={20}
                placeholder={t('post.titlePlaceholder')}
                className="wiselearn-input"
                onChange={(e) => setTitleValue(e.target.value)}
              />
              <span className="wiselearn-char-count">
                {titleValue.length} / 20
              </span>
            </div>
          </Form.Item>

          <Form.Item
            label={t('post.category')}
            name="category"
            rules={[{ required: true, message: t('post.categoryRequired') }]}
          >
            <Select
              options={categories}
              placeholder={t('post.categoryPlaceholder')}
              className="wiselearn-select"
            />
          </Form.Item>

          <Form.Item
            label={t('post.content')}
            required
            className="wiselearn-content-form-item"
          >
            <div className="wiselearn-editor-wrapper">
              <RichTextEditor
                ref={editorRef}
                value={contentHtml}
                onChange={setContentHtml}
                placeholder={t('post.contentPlaceholder')}
                minHeight={280}
                onReady={handleEditorReady}
              />
              <EditorToolbar editor={editorReady ? editorRef.current?.editor ?? null : null} />
            </div>
          </Form.Item>
        </Form>
      </div>

      <div className="wiselearn-post-editor-footer">
        <Button
          className="wiselearn-btn-cancel"
          onClick={() => navigate(`/posts/${postId}`)}
        >
          {t('post.cancel')}
        </Button>
        <Button
          type="primary"
          className="wiselearn-btn-publish"
          loading={saving}
          onClick={() => form.submit()}
        >
          {t('post.saveUpdate')}
        </Button>
      </div>
    </div>
  )
}
