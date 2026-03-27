import React, { useEffect, useState } from 'react'
import { BlockNoteEditor } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { message as antMessage } from 'antd'
import { uploadImageApi } from '../shared/api'
import { useTranslation } from 'react-i18next'

import '@blocknote/mantine/style.css'
import './RichTextEditor.css'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: number
}

/**
 * Rich text editor using BlockNote (Notion-style block editor)
 * Supports drag-and-drop blocks, slash commands, and image uploads
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder: _placeholder = '写点什么…',
  minHeight = 200
}) => {
  const { t } = useTranslation()
  const [initialContentSet, setInitialContentSet] = useState(false)

  // Custom file upload handler
  const uploadFile = async (file: File): Promise<string> => {
    if (file.size > MAX_IMAGE_SIZE) {
      antMessage.error(t('auth.imageTooLarge'))
      throw new Error('File too large')
    }

    try {
      const { url } = await uploadImageApi(file)
      return url
    } catch (err) {
      console.error('Upload image failed', err)
      throw err
    }
  }

  // Create editor instance using hook
  const editor: BlockNoteEditor = useCreateBlockNote(
    {
      uploadFile,
      _tiptapOptions: {
        editorProps: {
          attributes: {
            class: 'wiselearn-blocknote-editor'
          }
        }
      }
    },
    []
  )

  // Set initial content from value prop when editor mounts
  useEffect(() => {
    if (!editor || initialContentSet || !value || value === '<p></p>' || value === '') return

    const insertInitialContent = async () => {
      try {
        const blocks = await editor.tryParseHTMLToBlocks(value)
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(editor.document, blocks)
          setInitialContentSet(true)
        }
      } catch (err) {
        console.error('Failed to parse HTML content', err)
      }
    }

    insertInitialContent()
  }, [editor, value, initialContentSet])

  // Handle content changes - export to HTML
  const handleChange = async () => {
    if (!onChange) return

    try {
      const html = await editor.blocksToHTMLLossy()
      onChange(html)
    } catch (err) {
      console.error('Failed to export HTML', err)
    }
  }

  return (
    <div className="wiselearn-rich-editor" style={{ minHeight }}>
      <BlockNoteView
        editor={editor}
        editable={true}
        onChange={handleChange}
        theme="light"
      />
    </div>
  )
}
