import React, { useRef, useState } from 'react'
import { Modal, Button, App } from 'antd'
import { CopyOutlined, DownloadOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import './ShareCard.css'

export interface ShareCardProps {
  open: boolean
  onClose: () => void
  title: string
  excerpt: string
  coverUrl?: string
  authorName: string
  authorAvatar?: string | null
  shareUrl: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export const ShareCard: React.FC<ShareCardProps> = ({
  open,
  onClose,
  title,
  excerpt,
  coverUrl,
  authorName,
  authorAvatar,
  shareUrl
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const plainExcerpt = stripHtml(excerpt).slice(0, 120) + (stripHtml(excerpt).length > 120 ? '…' : '')
  const avatarInitial = authorName ? authorName[0].toUpperCase() : 'U'

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      message.success(t('post.linkCopied'))
    } catch {
      message.error(t('post.copyFailed'))
    }
  }

  const handleSaveImage = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#fff' })
      const link = document.createElement('a')
      link.download = `share-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      message.success(t('share.imageSaved'))
    } catch {
      message.error(t('share.imageFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleCopyImage = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#fff' })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      message.success(t('share.imageCopied'))
    } catch {
      message.error(t('share.imageFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink()
      return
    }
    try {
      await navigator.share({
        title,
        text: plainExcerpt,
        url: shareUrl
      })
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={400}
      centered
      className="wiselearn-share-modal"
    >
      <div ref={cardRef} className="wiselearn-share-card">
        {coverUrl && (
          <div className="wiselearn-share-card__cover">
            <img src={coverUrl} alt="" />
          </div>
        )}

        <div className="wiselearn-share-card__body">
          <h2 className="wiselearn-share-card__title">{title}</h2>

          {plainExcerpt && (
            <p className="wiselearn-share-card__excerpt">{plainExcerpt}</p>
          )}

          <div className="wiselearn-share-card__meta">
            <div className="wiselearn-share-card__author">
              {authorAvatar ? (
                <img src={authorAvatar} alt="" className="wiselearn-share-card__avatar" />
              ) : (
                <span className="wiselearn-share-card__avatar wiselearn-share-card__avatar--initial">
                  {avatarInitial}
                </span>
              )}
              <span className="wiselearn-share-card__author-name">{authorName}</span>
            </div>
          </div>
        </div>

        <div className="wiselearn-share-card__footer">
          <div className="wiselearn-share-card__brand-row">
            <img src="/polyu-knot.png" alt="" className="wiselearn-share-card__logo" />
            <span className="wiselearn-share-card__brand">PolyU RedBrick</span>
          </div>
          <span className="wiselearn-share-card__link-hint">{t('share.tapToView')}</span>
        </div>
      </div>

      <div className="wiselearn-share-actions">
        <Button icon={<ShareAltOutlined />} type="primary" onClick={handleNativeShare}>
          {t('share.share')}
        </Button>
        <Button icon={<LinkOutlined />} onClick={handleCopyLink}>
          {t('post.copyLink')}
        </Button>
        <Button icon={<CopyOutlined />} onClick={handleCopyImage} loading={saving}>
          {t('share.copyImage')}
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleSaveImage} loading={saving}>
          {t('share.saveImage')}
        </Button>
      </div>
    </Modal>
  )
}
