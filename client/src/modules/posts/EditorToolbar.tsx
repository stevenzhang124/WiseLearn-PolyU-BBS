import React, { useState, useRef } from 'react'
import { App } from 'antd'
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
  const { message } = App.useApp()
  const { t, i18n } = useTranslation()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showHashtagPicker, setShowHashtagPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** 点击图片按钮时记下光标所在 block，避免点开文件选择器后失焦导致只能插到文末 */
  const imageInsertAnchorIdRef = useRef<string | null>(null)
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
      message.error(t('auth.imageTooLarge'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const urls = await Promise.all(files.map((file) => uploadImageApi(file).then((r) => r.url)))
      const anchorId = imageInsertAnchorIdRef.current
      imageInsertAnchorIdRef.current = null

      let refBlock =
        (anchorId ? editor.getBlock(anchorId) : undefined) ??
        (() => {
          try {
            return editor.getTextCursorPosition().block
          } catch {
            return undefined
          }
        })()

      if (!refBlock) {
        const doc = editor.document
        refBlock = doc[doc.length - 1]
      }

      editor.insertBlocks(
        urls.map((url) => ({ type: 'image' as const, props: { url } })),
        refBlock,
        'after'
      )
      message.success(t('post.imagesUploaded', { count: urls.length }))
    } catch (err) {
      console.error('Upload image failed', err)
      message.error(t('post.imagesUploadFailed'))
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
          onMouseDown={(e) => {
            e.preventDefault()
            if (!editor) return
            try {
              imageInsertAnchorIdRef.current = editor.getTextCursorPosition().block.id
            } catch {
              imageInsertAnchorIdRef.current = null
            }
          }}
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
