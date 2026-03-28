/**
 * 从帖子正文 HTML 中按出现顺序提取所有 <img src="..."> 的 URL（用于 image_urls）。
 */
export function extractImageUrlsFromContent(html: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  return [...html.matchAll(re)].map((m) => m[1])
}

/** 发帖正文与图片分区展示时，从 HTML 中移除内联图片，避免与 image_urls 重复 */
export function stripImagesFromHtml(html: string): string {
  if (!html) return html
  return html.replace(/<img\b[^>]*>/gi, '')
}
