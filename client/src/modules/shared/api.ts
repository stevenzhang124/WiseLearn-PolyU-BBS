import axios from 'axios'
import type { AuthUser } from '../auth/AuthContext'
import { compressImageForUpload } from './compressImageForUpload'

let inMemoryToken: string | null = null

export function setApiToken(token: string | null): void {
  inMemoryToken = token
}

const apiBaseURL =
  (import.meta.env.VITE_API_BASE_URL as string)?.trim() ||
  'http://localhost:4000/api'

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000
})

const uploadTimeoutMs = 180000

api.interceptors.request.use((config) => {
  const stored = window.localStorage.getItem('wiselearn_token')
  const token = inMemoryToken ?? stored
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const isNetworkError =
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      !error.response
    const msg = isNetworkError
      ? (localStorage.getItem('wiselearn_lang') === 'en'
          ? 'Network error. Please check your connection and try again.'
          : '网络连接失败，请检查网络后重试')
      : (error.response?.data?.message ??
          error.message ??
          '请求失败，请稍后重试')
    return Promise.reject(new Error(msg))
  }
)

export async function loginApi(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await api.post('/auth/login', { email, password })
  return res.data
}

/** 发送注册验证码到邮箱（仅 PolyU 邮箱） */
export async function sendVerificationCodeApi(email: string): Promise<void> {
  await api.post('/auth/send-code', { email: email.trim() })
}

/** 发送找回密码验证码（仅已注册的 PolyU 邮箱） */
export async function sendResetCodeApi(email: string): Promise<void> {
  await api.post('/auth/send-reset-code', { email: email.trim() })
}

/** 通过邮箱验证码重置密码 */
export async function resetPasswordApi(data: {
  email: string
  code: string
  password: string
}): Promise<void> {
  await api.post('/auth/reset-password', data)
}

export async function registerApi(data: {
  email: string
  password: string
  nickname: string
  code: string
}): Promise<void> {
  await api.post('/auth/register', data)
}

export async function getMeApi(token?: string): Promise<AuthUser> {
  const res = await api.get('/auth/me', {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  })
  return res.data
}

export async function updateNicknameApi(nickname: string): Promise<void> {
  await api.put('/auth/nickname', { nickname })
}

export async function fetchPosts(params: {
  page: number
  pageSize: number
  sort: 'time' | 'hot' | 'views' | 'recent'
  /** 不传或 all 表示全部分类 */
  category?: string
}): Promise<any> {
  const res = await api.get('/posts', { params })
  return res.data
}

export async function createPost(data: {
  title: string
  content: string
  category: string
  imageUrls?: string[]
}): Promise<void> {
  await api.post('/posts', data)
}

export async function updatePost(
  id: number,
  data: { title: string; content: string; category: string; imageUrls?: string[] }
): Promise<void> {
  await api.put(`/posts/${id}`, data)
}

export async function fetchPostDetail(id: number): Promise<any> {
  const res = await api.get(`/posts/${id}`)
  return res.data
}

export async function fetchPostComments(
  postId: number,
  limit = 5
): Promise<{
  comments: Array<{
    id: number
    user_id: number
    content: string
    parent_comment_id: number | null
    created_at: string
    author: string
    author_avatar: string | null
  }>
  total: number
}> {
  const res = await api.get(`/posts/${postId}/comments`, { params: { limit } })
  return res.data
}

export async function sendComment(data: {
  postId: number
  content: string
  parentCommentId?: number
}): Promise<void> {
  await api.post(`/posts/${data.postId}/comments`, data)
}

export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/posts/comments/${commentId}`)
}

export async function toggleLike(postId: number): Promise<{ liked: boolean }> {
  const res = await api.post(`/posts/${postId}/like`)
  return res.data
}

export async function getShareLink(
  postId: number
): Promise<{ link: string; share_count: number }> {
  const res = await api.get(`/posts/${postId}/share-link`)
  return res.data
}

export async function getActivities(): Promise<any> {
  const res = await api.get('/posts/me/activities')
  return res.data
}

/** 上传图片，返回可访问的 URL（用于富文本插入图片） */
export async function uploadImageApi(file: File): Promise<{ url: string }> {
  const prepared = await compressImageForUpload(file, 'post')
  const form = new FormData()
  form.append('file', prepared)
  const res = await api.post<{ url: string }>('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: uploadTimeoutMs
  })
  return res.data
}

export async function getUserApi(id: number): Promise<{ id: number; nickname: string; avatar?: string | null }> {
  const res = await api.get(`/users/${id}`)
  return res.data
}

/** 当前用户资料（个人中心用：关注数、粉丝数、收到总赞数） */
export async function getMyProfileApi(): Promise<{
  id: number
  nickname: string
  avatar: string | null
  postCount: number
  followerCount: number
  followingCount: number
  totalLikes: number
}> {
  const res = await api.get('/users/me/profile')
  return res.data
}

/** 用户公开资料（发帖数、粉丝数、获赞数、是否已关注） */
export async function getUserProfileApi(id: number): Promise<{
  id: number
  nickname: string
  avatar: string | null
  postCount: number
  followerCount: number
  totalLikes: number
  isFollowing: boolean
}> {
  const res = await api.get(`/users/${id}/profile`)
  return res.data
}

/** 某用户的关注列表（关注的人） */
export async function getFollowingListApi(userId: number): Promise<{
  list: Array<{ id: number; nickname: string; avatar: string | null }>
}> {
  const res = await api.get(`/users/${userId}/following`)
  return res.data
}

/** 某用户的粉丝列表 */
export async function getFollowersListApi(userId: number): Promise<{
  list: Array<{ id: number; nickname: string; avatar: string | null }>
}> {
  const res = await api.get(`/users/${userId}/followers`)
  return res.data
}

/** 关注用户 */
export async function followUserApi(id: number): Promise<void> {
  await api.post(`/users/${id}/follow`)
}

/** 取消关注 */
export async function unfollowUserApi(id: number): Promise<void> {
  await api.delete(`/users/${id}/follow`)
}

/** 某用户发布的帖子列表 */
export async function getUserPostsApi(userId: number): Promise<{ list: any[] }> {
  const res = await api.get(`/users/${userId}/posts`)
  return res.data
}

/** 上传当前用户头像，返回新头像 URL */
export async function uploadAvatarApi(file: File): Promise<{ avatar: string }> {
  const prepared = await compressImageForUpload(file, 'avatar')
  const form = new FormData()
  form.append('file', prepared)
  const res = await api.put<{ avatar: string }>('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: uploadTimeoutMs
  })
  return res.data
}

export async function sendMessage(data: {
  toUserId: number
  content: string
}): Promise<void> {
  await api.post('/messages', data)
}

export async function fetchConversationsList(): Promise<{
  conversations: Array<{
    userId: number
    nickname: string
    lastMessageAt: string
    unreadCount: number
  }>
}> {
  const res = await api.get('/messages/conversations')
  return res.data
}

export async function fetchConversation(userId: number): Promise<any> {
  const res = await api.get(`/messages/conversation/${userId}`)
  return res.data
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await api.get('/messages/unread-count')
  return res.data
}

/** 消息中心未读数（点赞/关注/评论），私信未读见 getUnreadCount */
export async function getNotificationsUnreadCount(): Promise<{
  likes: number
  follows: number
  comments: number
}> {
  const res = await api.get('/notifications/unread-count')
  return res.data
}

export async function getNotificationsLikes(params?: {
  mark_read?: boolean
}): Promise<{
  list: Array<{
    likeId: number
    postId: number
    postTitle: string
    createdAt: string
    actor: { id: number; nickname: string; avatar: string | null }
  }>
  unreadCount: number
}> {
  const res = await api.get('/notifications/likes', {
    params: params?.mark_read ? { mark_read: '1' } : undefined
  })
  return res.data
}

export async function getNotificationsFollows(params?: {
  mark_read?: boolean
}): Promise<{
  list: Array<{
    createdAt: string
    actor: { id: number; nickname: string; avatar: string | null }
  }>
  unreadCount: number
}> {
  const res = await api.get('/notifications/follows', {
    params: params?.mark_read ? { mark_read: '1' } : undefined
  })
  return res.data
}

export async function getNotificationsComments(params?: {
  mark_read?: boolean
}): Promise<{
  list: Array<{
    commentId: number
    postId: number
    postTitle: string
    content: string
    parentCommentId: number | null
    createdAt: string
    actor: { id: number; nickname: string; avatar: string | null }
  }>
  unreadCount: number
}> {
  const res = await api.get('/notifications/comments', {
    params: params?.mark_read ? { mark_read: '1' } : undefined
  })
  return res.data
}

export async function markNotificationsRead(type: 'like' | 'follow' | 'comment'): Promise<void> {
  await api.post('/notifications/read', { type })
}

export async function fetchAdminStats(): Promise<any> {
  const res = await api.get('/admin/stats')
  return res.data
}

export async function searchAdminPosts(keyword: string): Promise<any> {
  const res = await api.get('/admin/posts/search', { params: { keyword } })
  return res.data
}

export async function pinPost(
  id: number,
  pinned: boolean
): Promise<void> {
  await api.post(`/admin/posts/${id}/pin`, { pinned })
}

export async function deletePostAdmin(id: number): Promise<void> {
  await api.delete(`/admin/posts/${id}`)
}

export async function fetchAdminPendingPosts(limit = 50): Promise<any> {
  const res = await api.get('/admin/posts/pending', { params: { limit } })
  return res.data
}

export async function approvePostAdmin(id: number): Promise<void> {
  await api.post(`/admin/posts/${id}/approve`)
}

export async function rejectPostAdmin(id: number, reason: string): Promise<void> {
  await api.post(`/admin/posts/${id}/reject`, { reason })
}

export async function updateUserLanguageApi(lang: 'zh' | 'en'): Promise<void> {
  await api.put('/users/me/language', { lang })
}

