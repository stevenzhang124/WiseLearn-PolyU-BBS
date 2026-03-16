import React from 'react'

export interface AvatarProps {
  /** 头像图片 URL，无则显示昵称首字 */
  src?: string | null
  /** 昵称，用于无图时显示首字 */
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * 统一头像展示：有图显示图片，无图显示昵称首字（理工红圆底）
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 40,
  className,
  style
}) => {
  const s = size
  const common: React.CSSProperties = {
    width: s,
    height: s,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(12, s * 0.4),
    fontWeight: 600,
    ...style
  }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={{ ...common, objectFit: 'cover' }}
      />
    )
  }
  return (
    <span
      className={className}
      style={{
        ...common,
        background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)',
        color: '#fff'
      }}
    >
      {(name || '?').charAt(0)}
    </span>
  )
}
