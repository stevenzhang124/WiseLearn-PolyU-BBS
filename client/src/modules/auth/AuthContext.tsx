import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMeApi, loginApi, setApiToken } from '../shared/api'

export interface AuthUser {
  id: number
  email: string
  nickname: string
  isAdmin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'wiselearn_token'

/**
 * 认证上下文，负责在前端持久化登录状态（本地存储 + 内存）
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY)
    if (stored) {
      setApiToken(stored)
    }
    return stored
  })

  useEffect(() => {
    if (!token) return
    void refreshMe()
  }, [token])

  const login = async (
    email: string,
    password: string,
    remember: boolean
  ): Promise<void> => {
    const { token: newToken, user: userInfo } = await loginApi(email, password)
    setToken(newToken)
    setUser(userInfo)
    setApiToken(newToken)
    if (remember) {
      window.localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  }

  const logout = (): void => {
    setUser(null)
    setToken(null)
    setApiToken(null)
    window.localStorage.removeItem(TOKEN_KEY)
  }

  const refreshMe = async (): Promise<void> => {
    if (!token) return
    try {
      const me = await getMeApi(token)
      setUser(me)
    } catch {
      logout()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshMe
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

