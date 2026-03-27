import React, { useState, useRef } from 'react'
import { message as antMessage } from 'antd'
import { PictureOutlined, SmileOutlined, NumberOutlined } from '@ant-design/icons'
import { BlockNoteEditor } from '@blocknote/core'
import { uploadImageApi } from '../shared/api'
import { MAX_IMAGE_UPLOAD_BYTES } from '../shared/imageUploadLimits'
import { useTranslation } from 'react-i18next'
import { EmojiMartInlinePicker } from './EmojiMartInlinePicker'

import './EditorToolbar.css'

// Common hashtags for quick access
const COMMON_HASHTAGS = [
  '#校园生活', '#求职分享', '#课程问答', '#学习经验',
  '#宿舍日常', '#美食推荐', '#社团活动', '#考试经验'
]

interface EditorToolbarProps {
  editor: BlockNoteEditor | null
}

/**
 * Editor toolbar with image, emoji, and hashtag buttons
 * Rendered inside the editor footer bar
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const { t, i18n } = useTranslation()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showHashtagPicker, setShowHashtagPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const hashtagPickerRef = useRef<HTMLDivElement>(null)

  // Close pickers when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (hashtagPickerRef.current && !hashtagPickerRef.current.contains(event.target as Node)) {
        setShowHashtagPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle image upload from file picker（支持一次多选）
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.files
    if (!raw?.length || !editor) return

    const files = Array.from(raw)
    const oversized = files.find((f) => f.size > MAX_IMAGE_UPLOAD_BYTES)
    if (oversized) {
      antMessage.error(t('auth.imageTooLarge'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const urls = await Promise.all(files.map((file) => uploadImageApi(file).then((r) => r.url)))
      const blocks = editor.document
      const ref = blocks[blocks.length - 1]
      editor.insertBlocks(
        urls.map((url) => ({ type: 'image' as const, props: { url } })),
        ref,
        'after'
      )
      antMessage.success(t('post.imagesUploaded', { count: urls.length }))
    } catch (err) {
      console.error('Upload image failed', err)
      antMessage.error(t('post.imagesUploadFailed'))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle emoji insertion at cursor position
  const handleEmojiInsert = (emoji: string) => {
    if (!editor) return

    // Use TipTap's insertContent to insert at cursor position
    const tiptapEditor = editor._tiptapEditor
    if (tiptapEditor) {
      tiptapEditor.chain().focus().insertContent(emoji).run()
    }
    setShowEmojiPicker(false)
  }

  // Handle hashtag insertion at cursor position
  const handleHashtagInsert = (hashtag: string) => {
    if (!editor) return

    // Use TipTap's insertContent to insert at cursor position
    const tiptapEditor = editor._tiptapEditor
    if (tiptapEditor) {
      tiptapEditor.chain().focus().insertContent(hashtag + ' ').run()
    }
    setShowHashtagPicker(false)
  }

  return (
    <div className="wiselearn-editor-footer">
      {/* Left side: toolbar buttons */}
      <div className="wiselearn-toolbar-buttons">
        {/* Image button */}
        <button
          type="button"
          className="wiselearn-toolbar-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <PictureOutlined className="wiselearn-toolbar-icon" />
          <span>{t('post.picture')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />

        {/* Emoji button */}
        <div ref={emojiPickerRef} className="wiselearn-picker-wrapper">
          <button
            type="button"
            className="wiselearn-toolbar-btn"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker)
              setShowHashtagPicker(false)
            }}
          >
            <SmileOutlined className="wiselearn-toolbar-icon" />
            <span>{t('post.emoji')}</span>
          </button>
          {showEmojiPicker && (
            <div className="wiselearn-emoji-mart-popover">
              <EmojiMartInlinePicker
                locale={i18n.language}
                onEmojiSelect={(native) => handleEmojiInsert(native)}
              />
            </div>
          )}
        </div>

        {/* Hashtag button */}
        <div ref={hashtagPickerRef} className="wiselearn-picker-wrapper">
          <button
            type="button"
            className="wiselearn-toolbar-btn"
            onClick={() => {
              setShowHashtagPicker(!showHashtagPicker)
              setShowEmojiPicker(false)
            }}
          >
            <NumberOutlined className="wiselearn-toolbar-icon" />
            <span>{t('post.hashtag')}</span>
          </button>
          {showHashtagPicker && (
            <div className="wiselearn-hashtag-picker">
              {COMMON_HASHTAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="wiselearn-hashtag-item"
                  onClick={() => handleHashtagInsert(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: help text */}
      <div className="wiselearn-toolbar-help">
        {t('post.toolbarHelp')}
      </div>
    </div>
  )
}
