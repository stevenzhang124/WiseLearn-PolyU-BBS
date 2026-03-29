/** 与 LayoutShell 中间栏 class 一致，仅此区域纵向滚动 */
export const MAIN_SCROLL_CLASS = 'wiselearn-main-scroll'

export function getMainScrollElement(): HTMLElement | null {
  return document.querySelector(`.${MAIN_SCROLL_CLASS}`)
}

export function getMainScrollTop(): number {
  const el = getMainScrollElement()
  return el != null ? el.scrollTop : window.scrollY
}

export function setMainScrollTop(y: number): void {
  const el = getMainScrollElement()
  if (el != null) el.scrollTop = y
  else window.scrollTo(0, y)
}
