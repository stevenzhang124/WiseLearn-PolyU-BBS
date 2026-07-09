import imageCompression from 'browser-image-compression'
import { MAX_IMAGE_UPLOAD_BYTES } from './imageUploadLimits'

export type CompressImagePurpose = 'post' | 'avatar'

const MIME = /^image\/(jpeg|png|gif|webp)$/i

/**
 * 上传前在浏览器侧缩小尺寸与体积，减轻带宽与服务器压力；服务端仍会统一转 WebP。
 */
export async function compressImageForUpload(
  file: File,
  purpose: CompressImagePurpose = 'post'
): Promise<File> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('IMAGE_TOO_LARGE')
  }
  if (!MIME.test(file.type)) {
    throw new Error('IMAGE_TYPE')
  }

  const options =
    purpose === 'avatar'
      ? {
          maxSizeMB: 0.85,
          maxWidthOrHeight: 512,
          useWebWorker: true,
          initialQuality: 0.85
        }
      : {
          maxSizeMB: 12,
          maxWidthOrHeight: 2560,
          useWebWorker: true,
          initialQuality: 0.88
        }

  try {
    const out = await imageCompression(file, options)
    if (out.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error('IMAGE_COMPRESS_FAILED')
    }
    return out
  } catch (e) {
    if ((e as Error).message === 'IMAGE_COMPRESS_FAILED') throw e
    if (file.size <= MAX_IMAGE_UPLOAD_BYTES) return file
    throw new Error('IMAGE_COMPRESS_FAILED')
  }
}
