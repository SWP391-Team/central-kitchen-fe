import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/api/types'

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isCentralStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // You could decode the JWT token here to get user info
      // For now, we'll just check if a token exists
    }
  }, [])

  const login = (user: User) => {
    setUser(user)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
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
