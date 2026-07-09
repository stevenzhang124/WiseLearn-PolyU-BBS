/**
 * 生成“标题封面图”（小红书风格简化版）
 * - 只基于标题文字绘制
 * - 返回可上传的 File（image/png）
 *
 * 注意：此文件只在浏览器环境调用（依赖 canvas + document）。
 */
export async function generateTitleCoverFile(title: string): Promise<File> {
  const safeTitle = (title ?? '').trim()
  const canvas = document.createElement('canvas')
  const width = 1080
  const height = 1080
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法初始化画布')
  }

  // 背景主题：随机选择，让封面更接近“社交平台封面风格”
  const randPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const themes = [
    {
      top: '#ffffff',
      bottom: '#ffe9ec',
      accent: '200, 16, 46'
    },
    {
      top: '#ffffff',
      bottom: '#e8ecff',
      accent: '59, 96, 255'
    },
    {
      top: '#ffffff',
      bottom: '#e8fff5',
      accent: '0, 180, 120'
    },
    {
      top: '#ffffff',
      bottom: '#fff1e6',
      accent: '255, 122, 0'
    },
    {
      top: '#ffffff',
      bottom: '#f2e8ff',
      accent: '163, 87, 255'
    }
  ] as const

  const theme = randPick([...themes])
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, theme.top)
  bg.addColorStop(1, theme.bottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // 轻微装饰纹理：点阵 + 斜线（避免太花）
  ctx.save()
  ctx.globalAlpha = 0.35
  const accentRGBA = `rgba(${theme.accent}, `
  // points
  ctx.fillStyle = `${accentRGBA}0.10)`
  const dotCount = 260
  for (let i = 0; i < dotCount; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const r = Math.random() * 2.2 + 0.4
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // diagonal lines (rare)
  if (Math.random() < 0.5) {
    ctx.globalAlpha = 0.22
    ctx.strokeStyle = `${accentRGBA}0.12)`
    ctx.lineWidth = 2
    const step = 90
    for (let x = -height; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
      ctx.stroke()
    }
  }
  ctx.restore()

  const titleLen = safeTitle.length
  let fontSize = 92
  if (titleLen > 32) fontSize = 64
  else if (titleLen > 24) fontSize = 72
  else if (titleLen > 16) fontSize = 82

  // 文本容器
  const paddingX = 72
  const containerY = 150
  const containerH = 700
  const containerX = paddingX
  const containerW = width - paddingX * 2

  // 背景卡片（半透明红色）
  const radius = Math.random() < 0.5 ? 36 : 44
  ctx.beginPath()
  ctx.moveTo(containerX + radius, containerY)
  ctx.arcTo(containerX + containerW, containerY, containerX + containerW, containerY + containerH, radius)
  ctx.arcTo(containerX + containerW, containerY + containerH, containerX, containerY + containerH, radius)
  ctx.arcTo(containerX, containerY + containerH, containerX, containerY, radius)
  ctx.arcTo(containerX, containerY, containerX + containerW, containerY, radius)
  ctx.closePath()
  ctx.fillStyle = `rgba(${theme.accent}, 0.06)`
  ctx.fill()
  ctx.strokeStyle = `rgba(${theme.accent}, 0.12)`
  ctx.lineWidth = 2
  ctx.stroke()

  // 标题文字排版（居中，最多 4 行；超过截断）
  const maxWidth = containerW
  const maxLines = 4
  const lineHeight = Math.round(fontSize * 1.18)
  const lines: string[] = []

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)'
  ctx.font = `800 ${fontSize}px "PingFang SC","Microsoft YaHei",Arial,sans-serif`

  const ellipsis = '…'
  let remaining = safeTitle || ' '

  const measure = (text: string) => ctx.measureText(text).width

  // wrap by characters (对中英文都比较稳妥)
  while (lines.length < maxLines && remaining.length > 0) {
    let acc = ''
    let idx = 0
    while (idx < remaining.length) {
      const next = acc + remaining[idx]
      if (acc === '' || measure(next) <= maxWidth) {
        acc = next
        idx++
      } else {
        break
      }
    }

    if (acc === '') break
    lines.push(acc)
    remaining = remaining.slice(idx)
  }

  if (remaining.length > 0 && lines.length > 0) {
    // 最后一行加省略号，尽量保持宽度
    let last = lines[lines.length - 1]
    while (last.length > 0 && measure(last + ellipsis) > maxWidth) {
      last = last.slice(0, -1)
    }
    lines[lines.length - 1] = last + ellipsis
  }

  const startY = containerY + Math.round(containerH / 2) - Math.round((lines.length - 1) * lineHeight / 2)
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight)
  }

  // 转 blob
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error('生成图片失败'))
      resolve(b)
    }, 'image/png')
  })

  return new File([blob], `title-cover-${Date.now()}.png`, { type: 'image/png' })
}

