import React, { useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Button, Space } from 'antd'
import { PictureOutlined } from '@ant-design/icons'
import { uploadImageApi } from '../shared/api'

import './RichTextEditor.css'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: number
}

/**
 * 富文本编辑器（Tiptap），支持加粗/列表/标题/图片上传
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '写点什么…',
  minHeight = 200
}) => {
  const handleUploadImage = useCallback(async (editor: Editor) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const { url } = await uploadImageApi(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch (err) {
        console.error('Upload image failed', err)
      }
    }
    input.click()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder })
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'wiselearn-editor-prose' },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const file = files[0]
        if (!file.type.startsWith('image/')) return false
        uploadImageApi(file).then(({ url }) => {
          const { schema } = view.state
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY
          })
          if (coordinates) {
            const node = schema.nodes.image.create({ src: url })
            const transaction = view.state.tr.insert(coordinates.pos, node)
            view.dispatch(transaction)
          }
        }).catch(console.error)
        return true
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile()
            if (file) {
              uploadImageApi(file).then(({ url }) => {
                const node = view.state.schema.nodes.image.create({ src: url })
                const transaction = view.state.tr.replaceSelectionWith(node)
                view.dispatch(transaction)
              }).catch(console.error)
              return true
            }
          }
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    }
  })

  React.useEffect(() => {
    if (!editor) return
    if (value === '' || value === '<p></p>') {
      if (editor.getHTML() !== '<p></p>') editor.commands.setContent('', { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="wiselearn-rich-editor" style={{ minHeight }}>
      <Space className="wiselearn-editor-toolbar" wrap>
        <Button
          type="text"
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          B
        </Button>
        <Button
          type="text"
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          I
        </Button>
        <Button
          type="text"
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          列表
        </Button>
        <Button
          type="text"
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          有序
        </Button>
        <Button
          type="text"
          size="small"
          icon={<PictureOutlined />}
          onClick={() => handleUploadImage(editor)}
        >
          图片
        </Button>
      </Space>
      <EditorContent editor={editor} className="wiselearn-editor-content" />
    </div>
  )
}
