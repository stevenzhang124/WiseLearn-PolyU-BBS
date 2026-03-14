import React from 'react'

/**
 * 香港理工大学风格 Logo（理工红圆形 + 理大字样）
 * 可替换为学校提供的正式 logo 图片
 */
export const PolyULogo: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="20" cy="20" r="19" fill="#C8102E" stroke="#fff" strokeWidth="1.5" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        理大
      </text>
    </svg>
  )
}
