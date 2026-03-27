import React from 'react'
import { useTranslation } from 'react-i18next'
import './FeedTabs.css'

export interface FeedTabsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

/**
 * FeedTabs - Horizontal category selector at top of main content
 * Categories: All, Campus Living, Class Q&A, Career, News, Mutual Help
 */
export const FeedTabs: React.FC<FeedTabsProps> = ({
  activeCategory,
  onCategoryChange
}) => {
  const { t } = useTranslation()

  const categories = [
    { key: 'all', label: t('home.category.all') },
    { key: 'campus', label: t('home.category.campus') },
    { key: 'class', label: t('home.category.class') },
    { key: 'career', label: t('home.category.career') },
    { key: 'news', label: t('home.category.news') },
    { key: 'help', label: t('home.category.help') }
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
