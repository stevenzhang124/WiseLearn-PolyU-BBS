import { useEffect, useRef } from 'react'
import data from '@emoji-mart/data'
import { Picker } from 'emoji-mart'

type Props = {
  /** emoji-mart 支持 zh / en 等 */
  locale: string
  onEmojiSelect: (native: string) => void
}

/**
 * 与 BlockNote 依赖栈一致的 emoji-mart Picker（完整分类 + 搜索），非 @emoji-mart/react 以兼容 React 19。
 */
export function EmojiMartInlinePicker({ locale, onEmojiSelect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onEmojiSelect)
  callbackRef.current = onEmojiSelect

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const martLocale = locale === 'en' ? 'en' : 'zh'
    const picker = new Picker({
      data,
      locale: martLocale,
      theme: 'light',
      previewPosition: 'none',
      searchPosition: 'sticky',
      skinTonePosition: 'search',
      dynamicWidth: true,
      onEmojiSelect: (emoji: { native?: string }) => {
        if (emoji?.native) callbackRef.current(emoji.native)
      }
    })

    el.replaceChildren(picker as unknown as Node)

    return () => {
      const node = picker as unknown as HTMLElement
      node.remove?.()
    }
  }, [locale])

  return <div ref={rootRef} className="wiselearn-emoji-mart-root" />
}
