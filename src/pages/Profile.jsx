import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { upsertProfile } from '../services/supabaseClient'
import { User, Phone, MapPin, Briefcase, Shield, Save, Loader, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    pincode: '',
    delivery_type: '',
    platform: '',
    is_tracking_enabled: true
  })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        pincode: profile.pincode || '',
        delivery_type: profile.delivery_type || '',
        platform: profile.platform || '',
        is_tracking_enabled: profile.is_tracking_enabled !== false
      })
    }
  }, [profile])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const { error: saveErr } = await upsertProfile({
        ...profile,
        ...form
      })
      if (saveErr) throw saveErr
      await refreshProfile()
      setSuccess('Profile updated successfully! ✨')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return (
    <div className="animate-in" style={{padding: '40px', textAlign: 'center'}}>
      <Loader className="animate-spin" size={40} color="var(--primary)" />
      <p style={{marginTop: '16px', color: 'var(--text-dim)'}}>Loading your profile...</p>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your account details and insurance preferences</p>
        </div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{alignItems: 'start'}}>
          {/* Main Profile Form */}
          <div className="card">
            <div className="card-body">
              <h3 className="section-title mb-24"><User size={18} /> Personal Information</h3>
              
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-group">
                    <User size={16} className="input-icon" />
                    <input 
                      type="text" 
                      className="form-input" 
                      value={form.full_name} 
                      onChange={e => setForm({...form, full_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="input-group">
                    <Phone size={16} className="input-icon" />
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <div className="input-group">
                      <MapPin size={16} className="input-icon" />
                      <input 
                        type="text" 
                        className="form-input" 
                        value={form.city} 
                        readOnly 
                        style={{background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)'}}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={form.pincode} 
                      onChange={e => setForm({...form, pincode: e.target.value})}
                    />
                  </div>
                </div>

                <h3 className="section-title mt-32 mb-16"><Briefcase size={18} /> Work Profile</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Delivery Type</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={form.delivery_type.toUpperCase()} 
                      readOnly 
                      style={{background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)'}}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={form.platform} 
                      readOnly 
                      style={{background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)'}}
                    />
                  </div>
                </div>

                <div style={{marginTop: '32px', display: 'flex', gap: '16px', alignItems: 'center'}}>
                  <button 
                    type="submit" 
                    className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
                    disabled={loading}
                  >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  {success && <div style={{color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600}}>
                    <CheckCircle size={18} /> {success}
                  </div>}
                  {error && <div style={{color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600}}>
                    <AlertTriangle size={18} /> {error}
                  </div>}
                </div>
              </form>
            </div>
          </div>

          {/* Preferences & Status */}
          <div className="animate-in delay-100">
            <div className="card mb-24" style={{background: 'linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05))', border: '1px solid var(--primary-light)'}}>
              <div className="card-body">
                <h3 className="section-title mb-16"><Shield size={18} /> Insurance Preferences</h3>
                
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)'}}>
                  <div>
                    <div style={{fontWeight: 700, fontSize: '0.95rem'}}>Live Geolocation Tracking</div>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px'}}>Auto-trigger claims based on your GPS movement.</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={form.is_tracking_enabled} 
                      onChange={e => {
                        const newVal = e.target.checked;
                        setForm({...form, is_tracking_enabled: newVal});
                        // Auto-save this specific setting for convenience
                        upsertProfile({...profile, is_tracking_enabled: newVal}).then(() => refreshProfile());
                      }} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="mt-20 p-16" style={{borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', borderLeft: '4px solid var(--accent-amber)'}}>
                  <p className="text-xs" style={{lineHeight: 1.6}}>
                    <strong style={{color: 'var(--accent-amber)'}}>Note:</strong> Disabling live tracking will require you to file claims manually when weather disruptions occur. Auto-payouts will be paused.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="section-title mb-16">Account Data</h3>
                <div style={{fontSize: '0.85rem'}}>
                  <div className="flex-between mb-12">
                    <span className="text-dim">User ID:</span>
                    <span className="text-xs code">{user.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex-between mb-12">
                    <span className="text-dim">Email Address:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex-between mb-12">
                    <span className="text-dim">Registered City:</span>
                    <span>{profile.city}</span>
                  </div>
                  <div className="flex-between">
                    <span className="text-dim">AI Risk Score:</span>
                    <span style={{color: 'var(--primary)', fontWeight: 800}}>{profile.risk_score}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
