import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Authentication/LoginPage'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import InventoryManagement from '@/pages/Inventory/InventoryManagement'
import ProductManagement from '@/pages/Inventory/ProductManagement'
import StoreInventoryPage from '@/pages/Inventory/StoreInventoryPage'
import SupplyOrderStorePage from '@/pages/SupplyOrder/SupplyOrderStorePage'
import SupplyOrderCentralKitchenPage from '@/pages/SupplyOrder/SupplyOrderCentralKitchenPage'
import CustomerOrderPage from '@/pages/CustomerOrder/CustomerOrderPage'
import KitchenProductionPage from '@/pages/KitchenProduction/KitchenProductionPage'
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
        
        {/* Central Kitchen Inventory - Admin, Central_Staff - Use store/1 */}
        <Route 
          path="/inventory/central-kitchen" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><InventoryManagement /></ProtectedRoute>} 
        />
        
        {/* Also support direct access via /inventory/store/1 */}
        <Route 
          path="/inventory/store/1" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><InventoryManagement /></ProtectedRoute>} 
        />
        
        {/* Dynamic Store Inventory - Admin, Store_Staff */}
        <Route 
          path="/inventory/store/:storeId" 
          element={<ProtectedRoute allowedRoles={[1, 3]}><StoreInventoryPage /></ProtectedRoute>} 
        />
        
        {/* Product Management - Admin, Central_Staff */}
        <Route 
          path="/products" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><ProductManagement /></ProtectedRoute>} 
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
        
        {/* Kitchen Production - Admin, Central_Staff */}
        <Route 
          path="/kitchen-production" 
          element={<ProtectedRoute allowedRoles={[1, 2]}><KitchenProductionPage /></ProtectedRoute>} 
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
