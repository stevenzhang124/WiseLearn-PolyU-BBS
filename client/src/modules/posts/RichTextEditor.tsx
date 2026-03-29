import { useEffect, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react'
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { App } from 'antd'
import { uploadImageApi } from '../shared/api'
import { MAX_IMAGE_UPLOAD_BYTES } from '../shared/imageUploadLimits'
import { stripImagesFromHtml } from './extractImageUrlsFromContent'
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
  /** 为 true 时移除图片/音视频/文件等媒体块与上传，正文仅排版；图片走独立上传区 */
  disableImages?: boolean
}

/**
 * Rich text editor using BlockNote (Notion-style block editor)
 * 默认可插入图片；disableImages 时无 Media（无 image/video/file/audio），图片走独立上传区
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({
    value = '',
    onChange,
    placeholder: _placeholder = '写点什么…',
    minHeight = 200,
    onReady,
    disableImages = false
  }, ref) => {
    const { message } = App.useApp()
    const { t } = useTranslation()
    const [initialContentSet, setInitialContentSet] = useState(false)

    const uploadFile = useCallback(
      async (file: File): Promise<string> => {
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
      },
      [message, t]
    )

    const editorOptions = useMemo(() => {
      const tiptap = {
        _tiptapOptions: {
          editorProps: {
            attributes: {
              class: 'wiselearn-blocknote-editor'
            }
          }
        }
      }
      if (disableImages) {
        const {
          image: _image,
          video: _video,
          file: _file,
          audio: _audio,
          ...blockSpecs
        } = defaultBlockSpecs
        return {
          schema: BlockNoteSchema.create({ blockSpecs }),
          ...tiptap
        }
      }
      return {
        uploadFile,
        ...tiptap
      }
    }, [disableImages, uploadFile])

    const editor = useCreateBlockNote(editorOptions, [disableImages, uploadFile]) as BlockNoteEditor

    useImperativeHandle(ref, () => ({
      editor,
      insertImage: (url: string) => {
        if (disableImages || !editor) return
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
    }), [editor, disableImages])

    useEffect(() => {
      if (editor && onReady) {
        onReady()
      }
    }, [editor, onReady])

    useEffect(() => {
      if (!editor || initialContentSet || !value || value === '<p></p>' || value === '') return

      const insertInitialContent = async () => {
        try {
          const html = disableImages ? stripImagesFromHtml(value) : value
          const blocks = await editor.tryParseHTMLToBlocks(html)
          if (blocks && blocks.length > 0) {
            editor.replaceBlocks(editor.document, blocks)
            setInitialContentSet(true)
          }
        } catch (err) {
          console.error('Failed to parse HTML content', err)
        }
      }

      void insertInitialContent()
    }, [editor, value, initialContentSet, disableImages])

    const handleChange = async () => {
      if (!onChange) return

      try {
        let html = await editor.blocksToHTMLLossy()
        if (disableImages) {
          html = stripImagesFromHtml(html)
        }
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
