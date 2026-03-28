import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { useTranslation } from 'react-i18next'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'

import '@blocknote/mantine/style.css'
import './RichTextEditor.css'

interface PostContentBlockNoteProps {
  /** 服务端返回的帖子 HTML，会先经 DOMPurify 再交给 BlockNote 解析 */
  html: string
}

/**
 * 帖子详情正文：DOMPurify 净化 → tryParseHTMLToBlocks → 只读 BlockNote，与发帖编辑器同套渲染。
 */
export const PostContentBlockNote: FC<PostContentBlockNoteProps> = ({ html }) => {
  const { t } = useTranslation()
  const [htmlFallback, setHtmlFallback] = useState<string | null>(null)
  const [contentReady, setContentReady] = useState(false)

  const sanitizedHtml = useMemo(
    () =>
      DOMPurify.sanitize(html || '', {
        ADD_ATTR: ['target']
      }),
    [html]
  )

  const editor = useCreateBlockNote(
    {
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

  useEffect(() => {
    setHtmlFallback(null)
    setContentReady(false)
  }, [sanitizedHtml])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const trimmed = sanitizedHtml.trim()
      if (!trimmed || trimmed === '<p></p>') {
        editor.replaceBlocks(editor.document, [{ type: 'paragraph' }])
        if (!cancelled) setContentReady(true)
        return
      }
      try {
        const blocks = await editor.tryParseHTMLToBlocks(sanitizedHtml)
        if (cancelled) return
        if (!blocks?.length) {
          setHtmlFallback(sanitizedHtml)
          return
        }
        editor.replaceBlocks(editor.document, blocks)
        if (!cancelled) setContentReady(true)
      } catch (err) {
        console.error('PostContentBlockNote: failed to parse HTML', err)
        if (!cancelled) setHtmlFallback(sanitizedHtml)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [editor, sanitizedHtml])

  if (htmlFallback !== null) {
    return (
      <div
        className="wiselearn-post-blocknote-fallback wiselearn-post-content-inner"
        // 已与 DOMPurify 净化，等同原详情页 innerHTML 路径
        dangerouslySetInnerHTML={{ __html: htmlFallback }}
      />
    )
  }

  return (
    <div
      className={`wiselearn-post-blocknote-readonly wiselearn-rich-editor wiselearn-post-blocknote wiselearn-post-blocknote-host${contentReady ? '' : ' wiselearn-post-blocknote-host--pending'}`}
    >
      {!contentReady && (
        <div
          className="wiselearn-post-blocknote-skeleton"
          aria-busy="true"
          aria-label={t('common.loading')}
        >
          <div className="wiselearn-post-blocknote-skeleton-line" />
          <div className="wiselearn-post-blocknote-skeleton-line wiselearn-post-blocknote-skeleton-line--short" />
          <div className="wiselearn-post-blocknote-skeleton-line" />
        </div>
      )}
      <div
        className={`wiselearn-post-blocknote-view${contentReady ? ' wiselearn-post-blocknote-view--ready' : ' wiselearn-post-blocknote-view--pending'}`}
      >
        <BlockNoteView editor={editor} editable={false} theme="light" />
      </div>
    </div>
  )
}
