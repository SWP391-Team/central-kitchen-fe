import { Outlet } from 'react-router-dom'

const MainLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: '#333', color: '#fff', padding: '1rem' }}>
        <h1>Central Kitchen Management</h1>
      </header>
      
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      
      <footer style={{ backgroundColor: '#f8f9fa', padding: '1rem', textAlign: 'center' }}>
        <p>&copy; 2026 Central Kitchen Management. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default MainLayout
