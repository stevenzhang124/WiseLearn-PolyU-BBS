import React from 'react'
import { useTranslation } from 'react-i18next'
import './FeedTabs.css'

export interface FeedTabsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

/**
 * FeedTabs - 与发帖分类 category 字段一致（便于筛选）
 */
export const FeedTabs: React.FC<FeedTabsProps> = ({
  activeCategory,
  onCategoryChange
}) => {
  const { t } = useTranslation()

  const categories = [
    { key: 'all', label: t('home.category.all') },
    { key: 'campus', label: t('home.category.campus') },
    { key: 'teaching', label: t('home.category.teaching') },
    { key: 'news', label: t('home.category.news') },
    { key: 'trading', label: t('home.category.trading') },
    { key: 'career', label: t('home.category.career') },
    { key: 'mutual', label: t('home.category.mutual') }
  ]

  return (
    <div className="wiselearn-feed-tabs">
      {categories.map((cat) => (
        <button
          key={cat.key}
          type="button"
          className={`wiselearn-feed-tab ${activeCategory === cat.key ? 'active' : ''}`}
          onClick={() => onCategoryChange(cat.key)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
