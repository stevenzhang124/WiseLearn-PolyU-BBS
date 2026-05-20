import React, { useCallback, useEffect, useRef, useState } from 'react'
import { App, Modal, Spin, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getShareLink, trackShareAction } from '../shared/api'
import './PostShareModal.css'

export interface PostShareModalProps {
  open: boolean
  postId: number
  /** 用于第三方分享的标题（纯文本） */
  postTitle: string
  onClose: () => void
  /** 后端返回的最新分享次数（列表/详情可更新展示） */
  onShareCount?: (count: number) => void
}

type ChannelId =
  | 'wechat'
  | 'moments'
  | 'instagram'
  | 'whatsapp'
  | 'facebook'
  | 'x'
  | 'qq'
  | 'qzone'
  | 'weibo'

function shareIconUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}share-icons/${file}`
}

function buildThirdPartyShareUrls(link: string, title: string) {
  const u = encodeURIComponent(link)
  const t = encodeURIComponent(title || 'PolyU RedBrick')
  const summary = encodeURIComponent(title || '')
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title || 'PolyU RedBrick'} ${link}`)}`,
    instagram: 'https://www.instagram.com/',
    qq: `https://connect.qq.com/widget/shareqq/index.html?url=${u}&title=${t}&summary=${summary}&desc=${summary}`,
    qzone: `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${u}&title=${t}&summary=${summary}`,
    weibo: `https://service.weibo.com/share/share.php?url=${u}&title=${t}`
  }
}

function qrDataUrl(link: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`
}

const CHANNELS: { id: ChannelId; iconFile: string; labelKey: string }[] = [
  { id: 'wechat', iconFile: 'wechat.png', labelKey: 'post.shareChannelWechat' },
  { id: 'moments', iconFile: 'moments.png', labelKey: 'post.shareChannelMoments' },
  { id: 'instagram', iconFile: 'instagram.png', labelKey: 'post.shareChannelInstagram' },
  { id: 'whatsapp', iconFile: 'whatsapp.png', labelKey: 'post.shareChannelWhatsApp' },
  { id: 'facebook', iconFile: 'facebook.png', labelKey: 'post.shareChannelFacebook' },
  { id: 'x', iconFile: 'x.png', labelKey: 'post.shareChannelX' },
  { id: 'qq', iconFile: 'qq.png', labelKey: 'post.shareChannelQQ' },
  { id: 'qzone', iconFile: 'qzone.png', labelKey: 'post.shareChannelQzone' },
  { id: 'weibo', iconFile: 'weibo.png', labelKey: 'post.shareChannelWeibo' }
]

/**
 * 帖子分享面板：复制链接、各平台跳转或复制链接兜底。
 * 只保留弹窗内二维码，不再重复弹出二维码页面。
 */
export const PostShareModal: React.FC<PostShareModalProps> = ({
  open,
  postId,
  postTitle,
  onClose,
  onShareCount
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackingShare, setTrackingShare] = useState(false)
  const trackedInSessionRef = useRef(false)
  const onShareCountRef = useRef(onShareCount)
  onShareCountRef.current = onShareCount

  useEffect(() => {
    if (!open) {
      setLink('')
      setError(null)
      setLoading(false)
      setTrackingShare(false)
      trackedInSessionRef.current = false
      return
    }
    if (!postId) return
    setLoading(true)
    setError(null)
    setLink('')
    void getShareLink(postId)
      .then(({ link: l, share_count }) => {
        setLink(l)
        onShareCountRef.current?.(share_count)
      })
      .catch((err: Error) => {
        setError(err.message || t('post.shareLoadFailed'))
      })
      .finally(() => setLoading(false))
  }, [open, postId, t])

  const copyLink = useCallback(async (): Promise<boolean> => {
    if (!link) return false
    try {
      await navigator.clipboard.writeText(link)
      message.success(t('post.linkCopied'))
      return true
    } catch {
      message.error(t('post.copyFailed'))
      return false
    }
  }, [link, message, t])

  const openExternal = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const tryNativeShare = useCallback(async (): Promise<boolean> => {
    return false
  }, [])

  const trackIfNeeded = useCallback(async () => {
    if (trackedInSessionRef.current) return
    setTrackingShare(true)
    try {
      const { share_count } = await trackShareAction(postId)
      trackedInSessionRef.current = true
      onShareCountRef.current?.(share_count)
    } finally {
      setTrackingShare(false)
    }
  }, [postId])

  const handleCopyButton = useCallback(async () => {
    if (trackingShare) return
    const ok = await copyLink()
    if (ok) await trackIfNeeded()
  }, [trackingShare, copyLink, trackIfNeeded])

  const onChannel = useCallback(
    async (id: ChannelId) => {
      if (!link || trackingShare) return
      const urls = buildThirdPartyShareUrls(link, postTitle)
      const fallbackCopy = async (hint?: string) => {
        const ok = await copyLink()
        if (ok) await trackIfNeeded()
        if (hint) message.info(hint)
        return ok
      }

      switch (id) {
        case 'wechat':
          await fallbackCopy(t('post.shareWechatPasteHint'))
          return
        case 'moments':
          await fallbackCopy(t('post.shareMomentsPasteHint'))
          return
        case 'instagram':
          openExternal(urls.instagram)
          await fallbackCopy(t('post.shareInstagramHint'))
          return
        case 'whatsapp':
          openExternal(urls.whatsapp)
          await fallbackCopy(t('post.shareWhatsAppHint'))
          return
        case 'facebook':
          openExternal(urls.facebook)
          await fallbackCopy(t('post.shareFacebookHint'))
          return
        case 'x':
          openExternal(urls.x)
          await fallbackCopy(t('post.shareXHint'))
          return
        case 'qq':
          openExternal(urls.qq)
          await fallbackCopy(t('post.shareQQHint'))
          return
        case 'qzone':
          openExternal(urls.qzone)
          await fallbackCopy(t('post.shareQzoneHint'))
          return
        case 'weibo':
          openExternal(urls.weibo)
          await fallbackCopy(t('post.shareWeiboHint'))
          return
        default:
      }
    },
    [link, trackingShare, postTitle, trackIfNeeded, copyLink, message, t, openExternal]
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
      className="post-share-modal"
      title={t('post.sharePanelTitle')}
    >
      {loading ? (
        <div className="post-share-modal__loading">
          <Spin />
        </div>
      ) : error ? (
        <Typography.Text type="danger">{error}</Typography.Text>
      ) : (
        <>
          <div className="post-share-modal__top">
            <div className="post-share-modal__preview">
              <div className="post-share-modal__preview-title" title={postTitle}>
                {postTitle || t('post.shareDefaultTitle')}
              </div>
              <button type="button" className="post-share-modal__copy-btn" onClick={() => void handleCopyButton()}>
                <LinkOutlined /> {t('post.copyLink')}
              </button>
              <div className="post-share-modal__url" title={link}>
                {link}
              </div>
            </div>
            <div className="post-share-modal__qr">
              <img src={qrDataUrl(link)} alt="" className="post-share-modal__qr-img" />
              <div className="post-share-modal__qr-caption">{t('post.shareQrHint')}</div>
            </div>
          </div>
          <div className="post-share-modal__hint">{t('post.shareWechatHint')}</div>
          <div className="post-share-modal__channels" role="list">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                className="post-share-modal__chip"
                disabled={trackingShare}
                onClick={() => void onChannel(ch.id)}
              >
                <span className="post-share-modal__chip-icon post-share-modal__chip-icon--image">
                  <img src={shareIconUrl(ch.iconFile)} alt="" draggable={false} />
                </span>
                <span className="post-share-modal__chip-label">{t(ch.labelKey)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
