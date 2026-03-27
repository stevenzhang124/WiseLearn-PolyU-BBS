import React, { useState, useRef } from 'react'
import { message as antMessage } from 'antd'
import { PictureOutlined, SmileOutlined, NumberOutlined } from '@ant-design/icons'
import { BlockNoteEditor } from '@blocknote/core'
import { uploadImageApi } from '../shared/api'
import { useTranslation } from 'react-i18next'

import './EditorToolbar.css'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

// Common emojis for quick access
const COMMON_EMOJIS = [
  '😀', '😂', '🥰', '😎', '🤔', '👍', '👏', '🎉',
  '❤️', '🔥', '✨', '🌟', '💯', '🙏', '💪', '😊'
]

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
  const { t } = useTranslation()
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

  // Handle image upload from file picker
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return

    if (file.size > MAX_IMAGE_SIZE) {
      antMessage.error(t('auth.imageTooLarge'))
      return
    }

    try {
      const { url } = await uploadImageApi(file)
      const blocks = editor.document
      editor.insertBlocks(
        [{ type: 'image', props: { url } }],
        blocks[blocks.length - 1],
        'after'
      )
      antMessage.success(t('post.picture') + ' uploaded')
    } catch (err) {
      console.error('Upload image failed', err)
      antMessage.error(t('post.picture') + ' upload failed')
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
            <div className="wiselearn-emoji-picker">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="wiselearn-emoji-item"
                  onClick={() => handleEmojiInsert(emoji)}
                >
                  {emoji}
                </button>
              ))}
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
