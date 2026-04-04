import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Policy from './pages/Policy'
import Claims from './pages/Claims'
import Payments from './pages/Payments'
import About from './pages/About'
import Profile from './pages/Profile'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminClaims from './pages/admin/AdminClaims'
import AdminWorkers from './pages/admin/AdminWorkers'
import AdminRegionRisk from './pages/admin/AdminRegionRisk'
import Debug from './pages/Debug'
import Layout from './components/Layout'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">
        <span className="logo-icon">🛡️</span>
        <span className="logo-text">GigShield</span>
      </div>
      <div className="loading-bar"><div className="loading-fill" /></div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, loading, profile } = useAuth()
  if (loading) return null
  
  if (user) {
    const isActuallyAdmin = user?.email?.includes('admin') || profile?.is_admin
    if (isActuallyAdmin) return <Navigate to="/admin" replace />
    if (!profile) return <Navigate to="/register" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

const AdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen text-center p-40">Verifying Admin Privileges...</div>
  
  const isActuallyAdmin = user?.email?.includes('admin') || profile?.is_admin
  if (!isActuallyAdmin) {
    console.warn("🛡️ Admin Check Failed. Redirecting to user portal.");
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="register" element={<Register />} />
            <Route path="policy" element={<Policy />} />
            <Route path="claims" element={<Claims />} />
            <Route path="payments" element={<Payments />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="claims" element={<AdminClaims />} />
            <Route path="workers" element={<AdminWorkers />} />
            <Route path="regions" element={<AdminRegionRisk />} />
            <Route path="settings" element={<div className="p-40 card">System Settings (Config: Low)</div>} />
          </Route>
          <Route path="/debug" element={<Debug />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
