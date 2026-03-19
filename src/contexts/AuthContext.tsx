import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/api/types'

const AUTH_USER_STORAGE_KEY = 'auth_user'
const TOKEN_STORAGE_KEY = 'token'

type StorageMode = 'local' | 'session'

interface AuthContextType {
  user: User | null
  login: (user: User, rememberMe?: boolean) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isCentralStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getStorageByMode = (mode: StorageMode) => (mode === 'local' ? localStorage : sessionStorage)

const detectInitialAuth = (): { user: User | null; mode: StorageMode } => {
  const localToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const localUser = localStorage.getItem(AUTH_USER_STORAGE_KEY)

  if (localToken && localUser) {
    try {
      return { user: JSON.parse(localUser) as User, mode: 'local' }
    } catch {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    }
  }

  const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  const sessionUser = sessionStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (sessionToken && sessionUser) {
    try {
      return { user: JSON.parse(sessionUser) as User, mode: 'session' }
    } catch {
      sessionStorage.removeItem(AUTH_USER_STORAGE_KEY)
    }
  }

  return { user: null, mode: 'session' }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialAuth = detectInitialAuth()
  const [user, setUser] = useState<User | null>(initialAuth.user)
  const [storageMode, setStorageMode] = useState<StorageMode>(initialAuth.mode)

  useEffect(() => {
    const localStore = getStorageByMode('local')
    const sessionStore = getStorageByMode('session')

    if (user) {
      const activeStore = getStorageByMode(storageMode)
      const inactiveStore = storageMode === 'local' ? sessionStore : localStore

      activeStore.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
      inactiveStore.removeItem(AUTH_USER_STORAGE_KEY)
      return
    }

    localStore.removeItem(AUTH_USER_STORAGE_KEY)
    sessionStore.removeItem(AUTH_USER_STORAGE_KEY)
  }, [user, storageMode])

  const login = (user: User, rememberMe = false) => {
    setStorageMode(rememberMe ? 'local' : 'session')
    setUser(user)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role_id === 1
  const isCentralStaff = user?.role_id === 2
  const isStoreStaff = user?.role_id === 3

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isCentralStaff, isStoreStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
