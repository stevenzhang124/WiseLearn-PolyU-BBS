import React, { useRef, useState, useCallback } from 'react'
import { App, Image } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { uploadImageApi } from '../shared/api'
import { MAX_IMAGE_UPLOAD_BYTES } from '../shared/imageUploadLimits'
import { POST_GALLERY_MAX_IMAGES } from './postGalleryMax'
import './PostImageUploadSection.css'

export interface PostImageUploadSectionProps {
  urls: string[]
  onChange: (urls: string[]) => void
  maxCount?: number
}

function isImageFile(f: File): boolean {
  return Boolean(f.type && f.type.startsWith('image/'))
}

/**
 * 发帖 / 编辑：正文与图片分离时的独立上传区（点击或拖拽）
 */
export const PostImageUploadSection: React.FC<PostImageUploadSectionProps> = ({
  urls,
  onChange,
  maxCount = POST_GALLERY_MAX_IMAGES
}) => {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const removeAt = (index: number) => {
    onChange(urls.filter((_, i) => i !== index))
  }

  const uploadFiles = useCallback(
    async (rawFiles: File[]) => {
      if (!rawFiles.length) return
      const files = rawFiles.filter(isImageFile)
      if (!files.length) {
        message.warning(t('post.imagesDropNeedImage'))
        return
      }

      const remaining = maxCount - urls.length
      if (remaining <= 0) {
        message.warning(t('post.imagesMaxReached', { max: maxCount }))
        return
      }

      const toAdd = files.slice(0, remaining)
      const oversized = toAdd.find((f) => f.size > MAX_IMAGE_UPLOAD_BYTES)
      if (oversized) {
        message.error(t('auth.imageTooLarge'))
        return
      }

      setUploading(true)
      try {
        const newUrls = await Promise.all(toAdd.map((file) => uploadImageApi(file).then((r) => r.url)))
        onChange([...urls, ...newUrls])
        message.success(t('post.imagesUploaded', { count: newUrls.length }))
      } catch (err) {
        console.error(err)
        message.error(t('post.imagesUploadFailed'))
      } finally {
        setUploading(false)
      }
    },
    [maxCount, message, onChange, t, urls]
  )

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    const files = Array.from(list)
    if (inputRef.current) inputRef.current.value = ''
    await uploadFiles(files)
  }

  const onZoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (urls.length < maxCount) setDragOver(true)
  }

  const onZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as HTMLElement).contains(related)) return
    setDragOver(false)
  }

  const onZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (urls.length < maxCount) e.dataTransfer.dropEffect = 'copy'
    else e.dataTransfer.dropEffect = 'none'
  }

  const onZoneDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (urls.length >= maxCount || uploading) return
    const dropped = Array.from(e.dataTransfer.files || [])
    await uploadFiles(dropped)
  }

  const canAdd = urls.length < maxCount

  return (
    <div
      className={`wiselearn-post-image-upload${dragOver && canAdd ? ' wiselearn-post-image-upload--dragover' : ''}`}
      onDragEnter={onZoneDragEnter}
      onDragLeave={onZoneDragLeave}
      onDragOver={onZoneDragOver}
      onDrop={onZoneDrop}
    >
      <div className="wiselearn-post-image-upload__head">
        <span className="wiselearn-post-image-upload__label">{t('post.uploadImages')}</span>
        <div className="wiselearn-post-image-upload__head-right">
          <span className="wiselearn-post-image-upload__hint">{t('post.uploadImagesHint')}</span>
          <span className="wiselearn-post-image-upload__count">
            {urls.length} / {maxCount}
          </span>
        </div>
      </div>
      <div className="wiselearn-post-image-upload__grid">
        <Image.PreviewGroup>
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="wiselearn-post-image-upload__thumb">
              <Image
                src={url}
                alt=""
                width="100%"
                height="100%"
                style={{ objectFit: 'cover', display: 'block' }}
                preview={{ mask: t('home.previewImage') }}
              />
              <button
                type="button"
                className="wiselearn-post-image-upload__remove"
                onClick={(e) => { e.stopPropagation(); removeAt(index) }}
                aria-label={t('post.removeImage')}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </Image.PreviewGroup>
        {canAdd && (
          <label className="wiselearn-post-image-upload__add">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              disabled={uploading}
              className="wiselearn-post-image-upload__input"
              onChange={onFilesSelected}
            />
            <span className="wiselearn-post-image-upload__add-inner">
              <PlusOutlined className="wiselearn-post-image-upload__add-icon" />
              <span>{t('post.addImage')}</span>
            </span>
          </label>
        )}
      </div>
    </div>
  )
}
