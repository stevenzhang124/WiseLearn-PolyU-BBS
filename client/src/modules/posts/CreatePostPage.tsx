import React, { useState, useRef, useCallback } from 'react'
import { App, Button, Checkbox, Form, Input, Modal, Select } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPost } from '../shared/api'
import { RichTextEditor } from './RichTextEditor'
import type { RichTextEditorRef } from './RichTextEditor'
import { EditorToolbar } from './EditorToolbar'
import { stripImagesFromHtml } from './extractImageUrlsFromContent'
import { PostImageUploadSection } from './PostImageUploadSection'
import { POST_CATEGORY_VALUES } from './postCategoryValues'
import './PostEditorPage.css'

/**
 * 发帖页：富文本编辑 + 图片上传（布局与 PostEditorPage.css 与编辑页共用）
 */
export const CreatePostPage: React.FC = () => {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const [contentHtml, setContentHtml] = useState('')
  const [titleValue, setTitleValue] = useState('')
  const [editorReady, setEditorReady] = useState(false)
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([])
  const [pendingPayload, setPendingPayload] = useState<any | null>(null)
  const [moderationModalOpen, setModerationModalOpen] = useState(false)
  const [moderationInfo, setModerationInfo] = useState<{ matchedWords: string[]; flags: string[] } | null>(null)
  const navigate = useNavigate()
  const editorRef = useRef<RichTextEditorRef>(null)
  const contentSectionRef = useRef<HTMLDivElement>(null)

  const scrollToContentSection = () => {
    requestAnimationFrame(() => {
      contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const selectedAnonymous = Form.useWatch('anonymous', form) as boolean | undefined
  const selectedCategory = Form.useWatch('category', form) as string | undefined
  const anonymousDisabled = selectedCategory === 'trading' || selectedCategory === 'news'
  const categories = POST_CATEGORY_VALUES.filter((value) => {
    if (selectedAnonymous && (value === 'trading' || value === 'news')) return false
    return true
  }).map((value) => ({
    label: t(`home.category.${value}` as const),
    value
  }))

  const handleEditorReady = useCallback(() => {
    setEditorReady(true)
  }, [])

  const submitPost = async (payload: {
    title: string
    category: string
    anonymous?: boolean
    confirmed?: boolean
  }) => {
    setCreating(true)
    try {
      const bodyHtml = stripImagesFromHtml(contentHtml)
      const imageUrls = attachedImageUrls.length > 0 ? attachedImageUrls : []
      const result = await createPost({
        title: payload.title,
        category: payload.category,
        content: bodyHtml,
        imageUrls,
        anonymous: Boolean(payload.anonymous) && !anonymousDisabled
      })
      if (result.moderation?.reviewRequired && !payload.confirmed) {
        setPendingPayload(payload)
        setModerationInfo({ matchedWords: result.moderation.matchedWords, flags: result.moderation.flags })
        setModerationModalOpen(true)
        return
      }
      message.success(result.message || t('post.createSuccess'))
      form.resetFields()
      setContentHtml('')
      setTitleValue('')
      setAttachedImageUrls([])
      setPendingPayload(null)
      setModerationInfo(null)
      navigate('/')
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const onCreatePost = async (values: {
    title: string
    category: string
    anonymous?: boolean
  }) => {
    if (!contentHtml || contentHtml === '<p></p>') {
      message.warning(t('post.contentRequired'))
      scrollToContentSection()
      return
    }
    await submitPost(values)
  }

  return (
    <div className="wiselearn-post-editor">
      <div className="wiselearn-post-editor-body">
        <Form
          form={form}
          layout="vertical"
          scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
          onFinish={onCreatePost}
        >
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

          <Form.Item shouldUpdate noStyle>
            {() => (
              <Form.Item
                name="anonymous"
                valuePropName="checked"
                style={{ marginTop: -8, marginBottom: 16 }}
                tooltip={anonymousDisabled ? t('post.anonymousDisabledHint') : undefined}
              >
                <Checkbox disabled={anonymousDisabled}>
                  {t('post.anonymousPublish')}
                </Checkbox>
              </Form.Item>
            )}
          </Form.Item>

          <div ref={contentSectionRef} id="wiselearn-post-content-anchor">
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
                  disableImages
                />
                <EditorToolbar
                  editor={editorReady ? editorRef.current?.editor ?? null : null}
                  showImageButton={false}
                  showHashtagButton={false}
                />
              </div>
            </Form.Item>
          </div>

          <div className="wiselearn-post-images-section">
            <PostImageUploadSection urls={attachedImageUrls} onChange={setAttachedImageUrls} />
          </div>
        </Form>
      </div>

      <div className="wiselearn-post-editor-footer">
        <Button className="wiselearn-btn-cancel" onClick={() => navigate('/')}>{t('post.cancel')}</Button>
        <Button type="primary" className="wiselearn-btn-publish" loading={creating} onClick={() => form.submit()}>{t('post.publish')}</Button>
      </div>

      <Modal
        open={moderationModalOpen}
        title={t('post.moderationTitle')}
        okText={t('post.confirmSend')}
        cancelText={t('post.reEdit')}
        onOk={async () => {
          if (!pendingPayload) return
          setModerationModalOpen(false)
          await submitPost({ ...pendingPayload, confirmed: true })
        }}
        onCancel={() => {
          setModerationModalOpen(false)
          setPendingPayload(null)
          setModerationInfo(null)
        }}
        destroyOnHidden
      >
        <div style={{ lineHeight: 1.7 }}>
          <div>{t('post.moderationWarning')}</div>
          <div style={{ marginTop: 8 }}>
            <strong>{t('post.moderationMatchedWords')}:</strong> {moderationInfo?.matchedWords?.length ? moderationInfo.matchedWords.join(', ') : '--'}
          </div>
          <div>
            <strong>{t('post.moderationFlags')}:</strong> {moderationInfo?.flags?.length ? moderationInfo.flags.join(', ') : '--'}
          </div>
        </div>
      </Modal>
    </div>
  )
}
