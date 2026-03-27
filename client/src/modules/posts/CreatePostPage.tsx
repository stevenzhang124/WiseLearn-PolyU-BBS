import React, { useState, useRef, useCallback } from 'react'
import { Button, Form, Input, Select, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPost, uploadImageApi } from '../shared/api'
import { RichTextEditor } from './RichTextEditor'
import type { RichTextEditorRef } from './RichTextEditor'
import { EditorToolbar } from './EditorToolbar'
import { generateTitleCoverFile } from './generateTitleCover'
import './CreatePostPage.css'

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
  const [titleValue, setTitleValue] = useState('')
  const [editorReady, setEditorReady] = useState(false)
  const navigate = useNavigate()
  const editorRef = useRef<RichTextEditorRef>(null)

  const categories = categoryValues.map((c) => ({
    label: t(`home.category.${c.value}` as const),
    value: c.value
  }))

  // Callback when editor is ready - triggers re-render so toolbar gets the editor
  const handleEditorReady = useCallback(() => {
    setEditorReady(true)
  }, [])

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
      const firstImgMatch = contentHtml.match(/<img[^>]+src=["'][^"']+["'][^>]*>/i)
      const firstImgSrc = firstImgMatch ? firstImgMatch[0].match(/src=["']([^"']+)["']/i)?.[1] : null
      let imageUrls: string[]

      if (firstImgSrc) {
        imageUrls = [firstImgSrc]
      } else {
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
      setTitleValue('')
      navigate('/')
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="wiselearn-create-post">
      {/* Form section */}
      <div className="wiselearn-create-post-body">
        <Form form={form} layout="vertical" onFinish={onCreatePost}>
          {/* Title input */}
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

          {/* Category select */}
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

          {/* Content editor - using Form.Item for consistent label styling */}
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

      {/* Footer with action buttons */}
      <div className="wiselearn-create-post-footer">
        <Button
          className="wiselearn-btn-cancel"
          onClick={() => navigate('/')}
        >
          {t('post.cancel')}
        </Button>
        <Button
          type="primary"
          className="wiselearn-btn-publish"
          loading={creating}
          onClick={() => form.submit()}
        >
          {t('post.publish')}
        </Button>
      </div>
    </div>
  )
}
