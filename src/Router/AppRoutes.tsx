import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Authentication/LoginPage'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import CentralKitchenInventoryPage from '@/pages/Inventory/CentralKitchenInventoryPage'
import StoreDistrict1InventoryPage from '@/pages/Inventory/StoreDistrict1InventoryPage'
import StoreDistrict2InventoryPage from '@/pages/Inventory/StoreDistrict2InventoryPage'
import SupplyOrderStorePage from '@/pages/SupplyOrder/SupplyOrderStorePage'
import SupplyOrderCentralKitchenPage from '@/pages/SupplyOrder/SupplyOrderCentralKitchenPage'
import CustomerOrderPage from '@/pages/CustomerOrder/CustomerOrderPage'
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
        
        {/* Central Kitchen Inventory - Admin, Central_Staff */}
        <Route 
          path="/inventory/central-kitchen" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><CentralKitchenInventoryPage /></ProtectedRoute>} 
        />
        
        {/* Store District 1 Inventory - Admin, Store_Staff (store_id = 2) */}
        <Route 
          path="/inventory/store-district-1" 
          element={<ProtectedRoute allowedRoles={[1, 3]}><StoreDistrict1InventoryPage /></ProtectedRoute>} 
        />
        
        {/* Store District 2 Inventory - Admin, Store_Staff (store_id = 3) */}
        <Route 
          path="/inventory/store-district-2" 
          element={<ProtectedRoute allowedRoles={[1, 3]}><StoreDistrict2InventoryPage /></ProtectedRoute>} 
        />
        
        {/* Supply Order Store - Admin (read-only), Store_Staff */}
        <Route 
          path="/supply-order/store" 
          element={<ProtectedRoute allowedRoles={[1, 3]}><SupplyOrderStorePage /></ProtectedRoute>} 
        />
        
        {/* Supply Order Central Kitchen - Admin (read-only), Central_Staff */}
        <Route 
          path="/supply-order/central-kitchen" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><SupplyOrderCentralKitchenPage /></ProtectedRoute>} 
        />
        
        {/* Customer Order - Admin, Store_Staff */}
        <Route 
          path="/customer-order" 
          element={<ProtectedRoute allowedRoles={[1, 3]}><CustomerOrderPage /></ProtectedRoute>} 
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
