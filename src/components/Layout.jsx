import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../services/supabaseClient'
import { LayoutDashboard, ShieldCheck, FileText, Wallet, LogOut, Zap, Users, User } from 'lucide-react'

export default function Layout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'G'

  return (
    <div className="app-shell">
      {/* ───── SIDEBAR ───── */}
      <aside className="sidebar">
        <NavLink to="/dashboard" className="sidebar-logo">
          <span className="sidebar-logo-icon">🛡️</span>
          GigShield
          <span className="sidebar-badge">2026</span>
        </NavLink>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Main</span>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><LayoutDashboard size={18} /></span>
            Dashboard
          </NavLink>

          <NavLink to="/policy" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><ShieldCheck size={18} /></span>
            My Policy
          </NavLink>

          <NavLink to="/claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><Zap size={18} /></span>
            Claims
            {profile?.active_policy_id && <span className="nav-badge">Live</span>}
          </NavLink>

          <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><Wallet size={18} /></span>
            Payments
          </NavLink>

          <span className="nav-section-label">Account</span>

          <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><FileText size={18} /></span>
            Profile Setup
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><User size={18} /></span>
            Profile Settings
          </NavLink>

          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon"><Users size={18} /></span>
            About Team
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name || user?.email?.split('@')[0] || 'Gig Worker'}</div>
              <div className="user-role">{profile?.delivery_type || 'delivery'} • {profile?.platform || 'Platform'}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
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
