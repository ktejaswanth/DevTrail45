import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../services/supabaseClient'
import { LayoutDashboard, ShieldAlert, Users, Map, LogOut, Settings } from 'lucide-react'

export default function AdminLayout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Security Check: Only admins should see this (simplified for demo)
  // In real app, we'd check profile.is_admin
  const isAdmin = user?.email?.includes('admin') || profile?.is_admin

  if (!isAdmin && user) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark">
        <div className="text-center p-40 card">
          <h1 className="text-2xl font-bold text-coral mb-16">Access Denied</h1>
          <p className="text-muted mb-24">You do not have administrator privileges to view this area.</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell admin-shell">
      {/* ───── ADMIN SIDEBAR ───── */}
      <aside className="sidebar admin-sidebar">
        <div className="sidebar-logo admin-logo">
          <span className="sidebar-logo-icon">🛡️</span>
          Admin Control
          <span className="sidebar-badge admin-badge">GigShield</span>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Oversight</span>

          <NavLink to="/admin" end className={({ isActive }) => `sidebar-item-admin ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            Overview
          </NavLink>

          <NavLink to="/admin/claims" className={({ isActive }) => `sidebar-item-admin ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={18} />
            Claims Review
          </NavLink>

          <NavLink to="/admin/workers" className={({ isActive }) => `sidebar-item-admin ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            Worker Verification
          </NavLink>

          <NavLink to="/admin/regions" className={({ isActive }) => `sidebar-item-admin ${isActive ? 'active' : ''}`}>
            <Map size={18} />
            Region Monitoring
          </NavLink>

          <span className="nav-section-label">System</span>
          
          <NavLink to="/admin/settings" className={({ isActive }) => `sidebar-item-admin ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            Platform Config
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar admin-avatar">AD</div>
            <div className="user-info">
              <div className="user-name">System Admin</div>
              <div className="user-role">Superuser</div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ───── MAIN CONTENT ───── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
