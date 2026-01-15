import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <p className="text-center text-sm text-gray-600">
            &copy; 2026 Central Kitchen Management. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default MainLayout
