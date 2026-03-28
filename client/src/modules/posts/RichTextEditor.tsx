import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { BlockNoteEditor } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { App } from 'antd'
import { uploadImageApi } from '../shared/api'
import { MAX_IMAGE_UPLOAD_BYTES } from '../shared/imageUploadLimits'
import { useTranslation } from 'react-i18next'

import '@blocknote/mantine/style.css'
import './RichTextEditor.css'

// Common hashtags for quick access
export const COMMON_HASHTAGS = [
  '#校园生活', '#求职分享', '#课程问答', '#学习经验',
  '#宿舍日常', '#美食推荐', '#社团活动', '#考试经验'
]

export interface RichTextEditorRef {
  editor: BlockNoteEditor | null
  insertImage: (url: string) => void
  insertText: (text: string) => void
}

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: number
  onReady?: () => void
}

/**
 * Rich text editor using BlockNote (Notion-style block editor)
 * Supports drag-and-drop blocks, slash commands, and image uploads
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({
    value = '',
    onChange,
    placeholder: _placeholder = '写点什么…',
    minHeight = 200,
    onReady
  }, ref) => {
    const { message } = App.useApp()
    const { t } = useTranslation()
    const [initialContentSet, setInitialContentSet] = useState(false)

    // Custom file upload handler
    const uploadFile = async (file: File): Promise<string> => {
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        message.error(t('auth.imageTooLarge'))
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

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      editor,
      insertImage: (url: string) => {
        if (!editor) return
        let refBlock: (typeof editor.document)[number] | undefined
        try {
          refBlock = editor.getTextCursorPosition().block
        } catch {
          refBlock = undefined
        }
        if (!refBlock) {
          const doc = editor.document
          refBlock = doc[doc.length - 1]
        }
        editor.insertBlocks([{ type: 'image', props: { url } }], refBlock, 'after')
      },
      insertText: (text: string) => {
        if (!editor) return
        let refBlock: (typeof editor.document)[number] | undefined
        try {
          refBlock = editor.getTextCursorPosition().block
        } catch {
          refBlock = undefined
        }
        if (!refBlock) {
          const doc = editor.document
          refBlock = doc[doc.length - 1]
        }
        editor.insertBlocks(
          [{ type: 'paragraph', content: [{ type: 'text', text: text, styles: {} }] }],
          refBlock,
          'after'
        )
      }
    }), [editor])

    // Notify parent when editor is ready
    useEffect(() => {
      if (editor && onReady) {
        onReady()
      }
    }, [editor, onReady])

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
)

RichTextEditor.displayName = 'RichTextEditor'
