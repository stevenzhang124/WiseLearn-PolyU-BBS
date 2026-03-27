/**
 * 从帖子正文 HTML 中按出现顺序提取所有 <img src="..."> 的 URL（用于 image_urls）。
 */
export function extractImageUrlsFromContent(html: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  return [...html.matchAll(re)].map((m) => m[1])
}
