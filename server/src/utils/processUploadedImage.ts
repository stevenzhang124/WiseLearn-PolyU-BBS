import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

/** 与 multer 一致：单张上传原始文件上限 */
export const MAX_UPLOAD_IMAGE_BYTES = 60 * 1024 * 1024

export type ProcessImageVariant = 'post' | 'avatar'

/**
 * 将磁盘上的临时上传文件转为 WebP（限制长边、旋转 EXIF），并删除原文件。
 */
export async function processUploadedImage(
  inputPath: string,
  variant: ProcessImageVariant
): Promise<{ filename: string }> {
  const maxDim = variant === 'avatar' ? 512 : 2560
  const dir = path.dirname(inputPath)
  const baseName = path.basename(inputPath, path.extname(inputPath))
  const outName = `${baseName}.webp`
  const outPath = path.join(dir, outName)

  try {
    await sharp(inputPath, { failOn: 'none' })
      .rotate()
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(outPath)
  } catch {
    await fs.unlink(inputPath).catch(() => {})
    throw new Error('图片无法处理，请换一张或检查文件是否损坏')
  }

  await fs.unlink(inputPath).catch(() => {})
  return { filename: outName }
}
