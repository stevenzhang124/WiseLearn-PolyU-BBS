import { Router } from 'express'
import { pool } from '../db'

export const shareRouter = Router()

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * H5 分享落地页 /s/:id
 * - 带 Open Graph meta 标签，方便微信/WhatsApp/Twitter 等爬虫抓取预览卡片
 * - 展示帖子缩略信息 + 注册引导 CTA
 */
shareRouter.get('/:id', async (req, res) => {
  const postId = Number(req.params.id)
  if (Number.isNaN(postId)) {
    res.status(404).send('Not Found')
    return
  }

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.image_urls, p.created_at,
              u.nickname AS author, u.avatar AS author_avatar
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.audit_status = 1
       LIMIT 1`,
      [postId]
    )
    const post = (rows as any[])[0]
    if (!post) {
      res.status(404).send('Not Found')
      return
    }

    const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`
    const frontendBase = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173'
    const postUrl = `${frontendBase.replace(/\/$/, '')}/posts/${postId}`

    const title = escapeHtml(post.title || 'PolyU RedBrick')
    const plainText = stripHtml(post.content || '')
    const description = escapeHtml(plainText.slice(0, 150) + (plainText.length > 150 ? '…' : ''))
    const author = escapeHtml(post.author || '')
    const avatarUrl = post.author_avatar ? `${apiBase}${post.author_avatar}` : ''

    const imageUrls = post.image_urls
      ? String(post.image_urls).split(',').map((s: string) => s.trim()).filter(Boolean)
      : []
    const coverUrl = imageUrls.length > 0
      ? (imageUrls[0].startsWith('http') ? imageUrls[0] : `${apiBase}${imageUrls[0]}`)
      : ''

    const createdAt = new Date(post.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - PolyU RedBrick</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:site_name" content="PolyU RedBrick">
<meta property="og:url" content="${escapeHtml(postUrl)}">
${coverUrl ? `<meta property="og:image" content="${escapeHtml(coverUrl)}">` : ''}
<meta name="twitter:card" content="${coverUrl ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${coverUrl ? `<meta name="twitter:image" content="${escapeHtml(coverUrl)}">` : ''}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',system-ui,-apple-system,sans-serif;background:#f5f6f7;color:#262626;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.wrap{max-width:480px;width:100%;margin:0 auto;padding:16px}
.brand{display:flex;align-items:center;gap:8px;padding:20px 0 16px;justify-content:center}
.brand img{width:28px;height:28px}
.brand span{font-size:16px;font-weight:700;color:#c8102e;letter-spacing:.5px}
.card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
.cover{width:100%;max-height:260px;overflow:hidden;background:#f0f0f0}
.cover img{width:100%;height:auto;max-height:260px;object-fit:cover;display:block}
.body{padding:20px}
.title{font-size:20px;font-weight:700;line-height:1.4;margin-bottom:10px;color:#1f1f1f}
.excerpt{font-size:14px;line-height:1.7;color:#666;margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.author-row{display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid #f5f5f5}
.avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,#c8102e,#8b0000);flex-shrink:0}
.avatar-text{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c8102e,#8b0000);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0}
.author-info{flex:1;min-width:0}
.author-name{font-size:14px;font-weight:500;color:#333}
.date{font-size:12px;color:#999}
.cta{margin-top:20px;text-align:center}
.cta-btn{display:inline-block;padding:14px 40px;background:#c8102e;color:#fff;font-size:16px;font-weight:600;border-radius:28px;text-decoration:none;box-shadow:0 4px 14px rgba(200,16,46,.3);transition:transform .2s,box-shadow .2s}
.cta-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,16,46,.4)}
.cta-btn:active{transform:scale(.97)}
.footer{margin-top:24px;text-align:center;font-size:12px;color:#bbb;padding-bottom:24px}
.footer a{color:#c8102e;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <span>PolyU RedBrick</span>
  </div>
  <div class="card">
    ${coverUrl ? `<div class="cover"><img src="${escapeHtml(coverUrl)}" alt=""></div>` : ''}
    <div class="body">
      <div class="title">${title}</div>
      ${description ? `<div class="excerpt">${description}</div>` : ''}
      <div class="author-row">
        ${avatarUrl
          ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="">`
          : `<span class="avatar-text">${escapeHtml(author[0] || 'U')}</span>`
        }
        <div class="author-info">
          <div class="author-name">${author}</div>
          <div class="date">${escapeHtml(createdAt)}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="cta">
    <a class="cta-btn" href="${escapeHtml(postUrl)}">查看完整内容</a>
  </div>
  <div class="footer">
    <a href="${escapeHtml(frontendBase)}">PolyU RedBrick</a> · 香港理工大学校园交流平台
  </div>
</div>
</body>
</html>`

    res.type('html').send(html)
  } catch (err) {
    console.error('Share page error', err)
    res.status(500).send('Server Error')
  }
})
