/**
 * 离开首页（/）时写入快照，再次进入首页时恢复列表、分页与滚动位置。
 * 无论从热门、消息或其它路由离开，只要首页卸载都会更新快照。
 */
export const HOME_FEED_RESTORE_KEY = 'wiselearn_home_feed_restore'

export const HOME_FEED_RESTORE_MAX_AGE_MS = 30 * 60 * 1000

export type HomeFeedRestorePayload = {
  scrollY: number
  category: string
  sortTab: 'time' | 'hot'
  posts: unknown[]
  page: number
  total: number
  savedAt: number
}

export function saveHomeFeedSnapshot(
  payload: Omit<HomeFeedRestorePayload, 'savedAt'>
): void {
  try {
    const data: HomeFeedRestorePayload = { ...payload, savedAt: Date.now() }
    sessionStorage.setItem(HOME_FEED_RESTORE_KEY, JSON.stringify(data))
  } catch {
    // QuotaExceededError 等：忽略
  }
}
