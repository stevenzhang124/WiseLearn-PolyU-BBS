import React from 'react'
import { FeedPostItem } from './FeedPostItem'
import type { FeedPostItemProps } from './FeedPostItem'
import './FeedList.css'

export interface FeedListProps {
  posts: FeedPostItemProps['post'][]
  loading: boolean
  onLoadMore: () => void
  hasMore: boolean
  onNavigate: (path: string) => void
}

/**
 * Single-column feed list container
 * Renders a scrollable list of FeedPostItem components
 */
export const FeedList: React.FC<FeedListProps> = ({
  posts,
  loading,
  onLoadMore,
  hasMore,
  onNavigate
}) => {
  return (
    <div className="wiselearn-feed-list">
      {loading && posts.length === 0 ? (
        <div className="wiselearn-feed-loading">Loading...</div>
      ) : (
        <>
          {posts.map((post) => (
            <FeedPostItem
              key={post.id}
              post={post}
              onNavigate={onNavigate}
            />
          ))}

          {hasMore && (
            <div className="wiselearn-feed-load-more">
              <button
                type="button"
                className="wiselearn-feed-load-more-btn"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
