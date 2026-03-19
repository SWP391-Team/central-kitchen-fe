import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Authentication/LoginPage'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import ProductManagement from '@/pages/Inventory/ProductManagement'
import UnitManagement from '@/pages/Inventory/UnitManagement'
import ProductionPlanPage from '@/pages/ProductionPlan/ProductionPlanPage'
import ProductionBatchPage from '@/pages/ProductionBatch/ProductionBatchPage'
import BatchTransferPage from '@/pages/BatchTransfer/BatchTransferPage'
import QualityInspectionPage from '@/pages/QualityInspection/QualityInspectionPage'
import ReworkBatchPage from '@/pages/ReworkBatch/ReworkBatchPage'
import UserManagementPage from '@/pages/UserPage/UserManagementPage'
import LocationManagementPage from '@/pages/LocationManagement/LocationManagementPage'
import AuditLogPage from '@/pages/AuditLog/AuditLogPage'
import WarehouseReceivePage from '@/pages/WarehouseReceive/WarehouseReceivePage'
import InventoryPage from '@/pages/InventoryPage/InventoryPage'
import SupplyOrderPage from '@/pages/SupplyOrder/SupplyOrderPage'
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

        <Route
          path="/units"
          element={<ProtectedRoute allowedRoles={[1, 2]}><UnitManagement /></ProtectedRoute>}
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
        
        {/* Batch Transfer - Admin, Central_Staff */}
        <Route 
          path="/batch-transfer" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><BatchTransferPage /></ProtectedRoute>} 
        />
        
        {/* Quality Inspection - Admin, Central_Staff */}
        <Route 
          path="/quality-inspection" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><QualityInspectionPage /></ProtectedRoute>} 
        />
        
        {/* Rework Batch - Admin, Central_Staff */}
        <Route 
          path="/rework-batch" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><ReworkBatchPage /></ProtectedRoute>} 
        />
        
        {/* Warehouse Receive - Admin, Central_Staff */}
        <Route 
          path="/warehouse-receive" 
          element={<ProtectedRoute allowedRoles={[1, 2, 3]}><WarehouseReceivePage /></ProtectedRoute>} 
        />
        
        {/* Inventory - All roles (server filters by location) */}
        <Route 
          path="/inventory" 
          element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} 
        />

        <Route
          path="/supply-order"
          element={<ProtectedRoute allowedRoles={[1, 2, 3]}><SupplyOrderPage /></ProtectedRoute>}
        />
        
        {/* User Management - Admin only */}
        <Route 
          path="/users" 
          element={<ProtectedRoute allowedRoles={[1]}><UserManagementPage /></ProtectedRoute>} 
        />
        
        {/* Location Management - Admin only */}
        <Route 
          path="/locations" 
          element={<ProtectedRoute allowedRoles={[1]}><LocationManagementPage /></ProtectedRoute>} 
        />

        {/* Backward-compatible alias */}
        <Route 
          path="/stores" 
          element={<Navigate to="/locations" replace />} 
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
