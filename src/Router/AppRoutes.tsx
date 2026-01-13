import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/pages/Authentication/HomePage'
import LoginPage from '@/pages/Authentication/LoginPage'
import UserManagementPage from '@/pages/UserPage/UserManagementPage'
import { useAuth } from '@/contexts/AuthContext'

// Protected route wrapper
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <UserManagementPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default AppRouter
