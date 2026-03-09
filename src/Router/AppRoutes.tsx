import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Authentication/LoginPage'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import ProductManagement from '@/pages/Inventory/ProductManagement'
import ProductionPlanPage from '@/pages/ProductionPlan/ProductionPlanPage'
import ProductionBatchPage from '@/pages/ProductionBatch/ProductionBatchPage'
import UserManagementPage from '@/pages/UserPage/UserManagementPage'
import StoreManagementPage from '@/pages/StoreManagement/StoreManagementPage'
import AuditLogPage from '@/pages/AuditLog/AuditLogPage'
import { useAuth } from '@/contexts/AuthContext'

const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode, 
  allowedRoles?: number[] 
}) => {
  const { isAuthenticated, user } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role_id)) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* All protected routes use MainLayout with Sidebar */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Dashboard - accessible by all authenticated users */}
        <Route path="/" element={<DashboardPage />} />
        
        {/* Product Management - Admin, Central_Staff */}
        <Route 
          path="/products" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><ProductManagement /></ProtectedRoute>} 
        />
        
        {/* Production Plan - Admin, Central_Staff */}
        <Route 
          path="/production-plan" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><ProductionPlanPage /></ProtectedRoute>} 
        />
        
        {/* Production Batch - Admin, Central_Staff */}
        <Route 
          path="/production-batch" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><ProductionBatchPage /></ProtectedRoute>} 
        />
        
        {/* User Management - Admin only */}
        <Route 
          path="/users" 
          element={<ProtectedRoute allowedRoles={[1]}><UserManagementPage /></ProtectedRoute>} 
        />
        
        {/* Store Management - Admin only */}
        <Route 
          path="/stores" 
          element={<ProtectedRoute allowedRoles={[1]}><StoreManagementPage /></ProtectedRoute>} 
        />
        
        {/* Audit Log - Admin only */}
        <Route 
          path="/audit-log" 
          element={<ProtectedRoute allowedRoles={[1]}><AuditLogPage /></ProtectedRoute>} 
        />
      </Route>
    </Routes>
  )
}

export default AppRouter
