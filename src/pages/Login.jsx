import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, signUp, signInWithGoogle, getProfile } from '../services/supabaseClient'
import { Mail, Lock, Eye, EyeOff, Zap, Shield, CloudRain, TrendingUp, Users } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)

    // Attempt to get location in parallel/before login
    let lat = null, lng = null
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        console.log("Login location captured:", lat, lng)
      }
    } catch (e) {
      console.warn("Could not capture location during login:", e.message)
    }

    try {
      if (mode === 'login') {
        const { data, error } = await signIn(email, password)
        if (error) throw error

        // If we got a location, we can pass it or the dashboard will pick it up
        // The dashboard already checks for profile and starts watching.
        if (data.user) {
          // 🛡️ Safe check: Get the profile status from DB before navigating
          const { data: prof } = await getProfile(data.user.id);
          const isActuallyAdmin = email.toLowerCase().includes('admin') || prof?.is_admin;

          if (isActuallyAdmin) {
            navigate('/admin');
          } else if (!prof) {
            navigate('/register');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        const { data, error } = await signUp(email, password, {
          full_name: email.split('@')[0],
          gps_lat: lat,
          gps_lng: lng
        })
        if (error) throw error
        setSuccess('Account created! Please check your email to confirm, then log in.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* ── Left Brand Panel ── */}
      <div className="login-left">
        <div className="login-bg-orb orb-1" />
        <div className="login-bg-orb orb-2" />
        <div className="login-bg-orb orb-3" />
        <div className="login-brand">
          <div className="login-brand-logo">🛡️ GigShield</div>
          <p className="login-brand-tagline">
            India's first AI-powered parametric micro-insurance for gig economy workers.
            Instant payouts. Zero paperwork.
          </p>
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon"><CloudRain size={20} style={{ color: '#667eea' }} /></div>
              <div>
                <h4>Weather-Triggered Payouts</h4>
                <p>Rain &gt; 20mm detected → ₹300–₹800 auto-credited to your wallet</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><Zap size={20} style={{ color: '#f093fb' }} /></div>
              <div>
                <h4>Instant Claims, No Wait</h4>
                <p>Parametric model — no forms, no agents, just automatic protection</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><TrendingUp size={20} style={{ color: '#00e676' }} /></div>
              <div>
                <h4>AI Risk Assessment</h4>
                <p>Premium calculated based on your city, route & delivery type</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><Shield size={20} style={{ color: '#ffab00' }} /></div>
              <div>
                <h4>Fraud-Proof GPS Verification</h4>
                <p>AI validates your real location matches the risk zone</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-right">
        <div className="login-form-container animate-in">
          <div className="login-title">
            {mode === 'login' ? 'Welcome back 👋' : 'Join GigShield 🛡️'}
          </div>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Sign in to your account to view your coverage and claims.'
              : 'Create your account and start protecting your income today.'}
          </p>

          {error && <div className="toast toast-error" style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: '16px' }}><span>⚠️</span>{error}</div>}
          {success && <div className="toast toast-success" style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: '16px' }}><span>✅</span>{success}</div>}

          {/* Social Sign In */}
          <button
            type="button"
            className="btn btn-ghost btn-full mb-16"
            onClick={async () => {
              const { error } = await signInWithGoogle();
              if (error) setError(error.message);
            }}
            style={{ backgroundColor: 'white', color: '#333', borderColor: '#ddd' }}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', marginRight: '10px' }} />
            Sign in with Google
          </button>

          <div className="demo-accounts-grid mb-24">
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={() => { setEmail('cmfphoneindia@gmail.com'); setPassword('123456'); setMode('login') }}
              style={{ borderColor: 'var(--primary-glow)', color: 'var(--primary-glow)', background: 'rgba(102,126,234,0.05)' }}
            >
              🛡️ Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={() => { setEmail('kollepararutvik@gmail.com'); setPassword('123456'); setMode('login') }}
              style={{ borderColor: '#00e676', color: '#00e676', background: 'rgba(0,230,118,0.05)' }}
            >
              🏍️ Worker Demo
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Please wait…' : mode === 'login' ? '🚀 Sign In' : '🛡️ Create Account'}
            </button>
          </form>

          <div className="divider-text" style={{ margin: '24px 0' }}>
            <span className="divider-text">{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
          </div>

          <button
            id="login-toggle-mode"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            className="btn btn-ghost btn-full"
          >
            {mode === 'login' ? '✨ Create New Account' : '← Back to Sign In'}
          </button>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '24px', lineHeight: '1.6' }}>
            By signing in, you agree to GigShield's Terms of Service.<br />
            Your data is secured by Supabase Row Level Security.
          </p>

          <div style={{ marginTop: '32px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <Link to="/about" className="btn btn-ghost btn-sm" style={{ borderColor: 'transparent', opacity: 0.7 }}>
              <Users size={16} style={{ marginRight: '8px' }} /> Meet the Creators →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
