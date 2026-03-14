import axios from 'axios'
import type { AuthUser } from '../auth/AuthContext'

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 10000
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('wiselearn_token')
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const msg =
      error.response?.data?.message ??
      error.message ??
      '请求失败，请稍后重试'
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

export async function registerApi(data: {
  email: string
  password: string
  nickname: string
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
  sort: 'time' | 'hot'
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

export async function fetchPostDetail(id: number): Promise<any> {
  const res = await api.get(`/posts/${id}`)
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

export async function getShareLink(postId: number): Promise<{ link: string }> {
  const res = await api.get(`/posts/${postId}/share-link`)
  return res.data
}

export async function getActivities(): Promise<any> {
  const res = await api.get('/posts/me/activities')
  return res.data
}

export async function sendMessage(data: {
  toUserId: number
  content: string
}): Promise<void> {
  await api.post('/messages', data)
}

export async function fetchConversation(userId: number): Promise<any> {
  const res = await api.get(`/messages/conversation/${userId}`)
  return res.data
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await api.get('/messages/unread-count')
  return res.data
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

