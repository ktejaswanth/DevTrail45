import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPolicies, getClaims, getPayments, createClaim, createPayment, updateClaimStatus, logWeather, upsertProfile } from '../services/supabaseClient'
import { fetchWeatherByCity, fetchWeatherByCoords } from '../services/weatherService'
import { calculatePayout } from '../services/riskEngine'
import { getRiskLabel } from '../services/riskEngine'
import { requestNotificationPermission, notifyClaimTriggered, notifyPaymentReceived } from '../services/notificationService'
import { RefreshCw, Zap, CloudRain, Thermometer, Wind, Droplets, AlertTriangle, TrendingUp, Wallet, FileText, Shield, CheckCircle, ShieldAlert } from 'lucide-react'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const risk = getRiskLabel(profile?.city || 'Mumbai')
  const [policy, setPolicy] = useState(null)
  const [claims, setClaims] = useState([])
  const [payments, setPayments] = useState([])
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [autoCheckDone, setAutoCheckDone] = useState(false)
  const [liveLocation, setLiveLocation] = useState(null)
  const [showNotice, setShowNotice] = useState(true)

  useEffect(() => {
    const isAdminUser = user?.email?.includes('admin') || profile?.is_admin
    if (isAdminUser) navigate('/admin')
  }, [user, profile, navigate])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    const [{ data: policies }, { data: claimsData }, { data: paymentsData }] = await Promise.all([
      getPolicies(user.id),
      getClaims(user.id),
      getPayments(user.id),
    ])
    if (policies?.length) setPolicy(policies[0])
    setClaims(claimsData || [])
    setPayments(paymentsData || [])
    setAutoCheckDone(false) // Allow a fresh check whenever data is reloaded
  }, [user])

  const fetchWeather = useCallback(async (lat = null, lng = null) => {
    if (!profile) return
    setWeatherLoading(true)
    setAutoCheckDone(false) // Allow a fresh check for new weather data
    try {
      let w;
      if (lat && lng) {
        w = await fetchWeatherByCoords(lat, lng, profile.city || 'Custom')
      } else if (profile.gps_lat && profile.gps_lng) {
        w = await fetchWeatherByCoords(profile.gps_lat, profile.gps_lng, profile.city)
      } else {
        w = await fetchWeatherByCity(profile.city || 'Mumbai')
      }
      setWeather(w)
      await logWeather({ 
        city: w.city, 
        temperature: w.temperature, 
        feels_like: w.feels_like, 
        humidity: w.humidity, 
        rainfall_mm: w.rainfall_mm, 
        wind_speed: w.wind_speed, 
        description: w.description, 
        icon: w.icon, 
        alert_level: w.alert_level, 
        is_disruption: w.is_disruption, 
        raw_data: w.raw_data 
      })
    } catch (err) {
      console.error('Weather error:', err)
    } finally {
      setWeatherLoading(false)
    }
  }, [profile])

  // Auto-trigger claim if weather disruption detected
  const checkAutoTrigger = useCallback(async () => {
    if (!weather || !policy || autoCheckDone || !user) return
    setAutoCheckDone(true)
    if (weather.is_disruption) {
      // Check no claim in last 6 hours
      const recent = claims.find(c => {
        const t = new Date(c.triggered_at)
        return (Date.now() - t) < 6 * 3600 * 1000 && c.status !== 'rejected'
      })
      if (!recent) {
        await triggerClaim('auto', weather)
      }
    }
  }, [weather, policy, autoCheckDone, claims, user])

  useEffect(() => { loadData() }, [loadData])
  
  useEffect(() => { 
    if (!profile || !navigator.geolocation) return;
    // Only start if enabled in profile settings
    if (profile?.is_tracking_enabled === false) {
      console.log("Live tracking is disabled by user.");
      fetchWeather(); // Standard city fetch
      return;
    }
    
    console.log("Starting real-time location watching...");
    
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLiveLocation({ lat: latitude, lng: longitude });
        
        // Update profile in background if it's a significant change (optional optimization: check if moved > 500m)
        // For now, update every time the device reports a meaningful fix
        try {
          await upsertProfile({ ...profile, gps_lat: latitude, gps_lng: longitude });
          console.log("Live position synced:", latitude, longitude);
        } catch { }
        
        // Refresh weather for new spot
        fetchWeather(latitude, longitude);
      },
      () => {
        console.warn("Live tracking failed");
        fetchWeather(); // Fallback to city
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 1000 * 60 * 5, // 5 min cache
        timeout: 10000 
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [profile, fetchWeather])

  useEffect(() => { if (!weatherLoading) checkAutoTrigger() }, [weatherLoading, checkAutoTrigger])

  const triggerClaim = async (triggerType = 'manual', weatherData = weather) => {
    if (!policy || !user) return showToast('No active policy found. Please subscribe first.', 'error')
    setClaimLoading(true)
    try {
      const payout = calculatePayout(policy, weatherData || { alert_level: 'medium', rainfall_mm: 0, temperature: 30 })
      const claimData = {
        policy_id: policy.id,
        worker_id: user.id,
        trigger_type: triggerType,
        weather_event: weatherData?.disruption_type || 'Manual Claim',
        weather_data: weatherData,
        payout_amount: payout,
        status: 'triggered',
        worker_lat: profile?.gps_lat,
        worker_lng: profile?.gps_lng,
        fraud_score: 0,
      }
      const { data: claim, error: claimErr } = await createClaim(claimData)
      if (claimErr) throw claimErr

      // Notify User
      if (triggerType === 'auto') {
        notifyClaimTriggered(payout, weatherData?.disruption_type || 'Weather event')
      }

      // Admin Review Required: No more auto-payouts
      showToast(`🛡️ Claim filed successfully! Admin is reviewing it.`, 'success')
      loadData()
    } catch (err) {
      showToast(err.message || 'Claim failed. Please try again.', 'error')
    } finally {
      setClaimLoading(false)
    }
  }

  if (!profile) return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Dashboard</h1></div></div>
      <div className="page-body">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">Complete Your Profile First</div>
            <p className="empty-text">Set up your worker profile to activate insurance and start earning protection.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>🚀 Complete Registration</button>
          </div>
        </div>
      </div>
    </div>
  )

  const totalPayout = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const activeClaims = claims.filter(c => c.status !== 'paid' && c.status !== 'rejected').length

  return (
    <div>
      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="page-header">
        <div style={{flex: 1}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: (profile?.is_tracking_enabled && liveLocation) ? 'var(--accent-green)' : 'var(--text-dim)', marginBottom: '4px'}}>
            <div className={`status-dot ${(profile?.is_tracking_enabled && liveLocation) ? 'pulse' : ''}`} style={{background: (profile?.is_tracking_enabled && liveLocation) ? 'var(--accent-green)' : '#999'}} /> 
            { (profile?.is_tracking_enabled && liveLocation) ? 'Live Monitoring Active' : 'Live Monitoring Paused' }
            {liveLocation && <span className="text-xs text-muted" style={{marginLeft: '8px'}}>📍 {liveLocation.lat.toFixed(4)}, {liveLocation.lng.toFixed(4)}</span>}
          </div>
          <h1 className="page-title">Welcome back, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]} 👋</h1>
          <p className="page-subtitle">
            <span style={{color: liveLocation ? 'var(--accent-green)' : 'inherit', fontWeight: liveLocation ? 700 : 400}}>
              {liveLocation ? `🎯 Live: ${weather?.city || 'Detecting...'}` : `📍 ${profile?.city || 'Unknown'}`}
            </span>
            · {profile?.platform || 'Gig'} {profile?.delivery_type || 'Worker'} partner
          </p>
        </div>
        
        <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
          <button className="btn btn-ghost btn-sm" onClick={fetchWeather}><RefreshCw size={14} /> Refresh Weather</button>
          {policy && <button id="dash-manual-claim" className={`btn btn-amber btn-sm ${claimLoading?'btn-loading':''}`} onClick={() => triggerClaim('manual')} disabled={claimLoading}><Zap size={14} /> Manual Claim</button>}
        </div>
      </div>

      <div className="page-body">
        {/* ✨ REAL-TIME CLAIM NOTIFICATIONS ✨ */}
        {claims.filter(c => c.status === 'paid' || c.status === 'rejected').slice(0, 1).map(recentOutcome => (
          <div key={recentOutcome.id} className={`card mb-24 animate-in transition-all ${recentOutcome.status === 'paid' ? 'border-green-30' : 'border-coral-30'}`} style={{background: recentOutcome.status === 'paid' ? 'rgba(0,230,118,0.05)' : 'rgba(255,82,82,0.05)'}}>
             <div className="card-body p-20 flex items-center justify-between">
                <div className="flex gap-16 items-center">
                   <div className="stat-icon" style={{background: recentOutcome.status === 'paid' ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}}>
                      {recentOutcome.status === 'paid' ? <CheckCircle className="text-green" /> : <ShieldAlert className="text-coral" />}
                   </div>
                   <div>
                      <h4 className="font-bold text-lg mb-2">
                         Claim Resolution: {recentOutcome.status === 'paid' ? '🎉 Payout Approved!' : '❌ Claim Disputed'}
                      </h4>
                      <p className="text-sm text-dim">
                        {recentOutcome.status === 'paid' ? `Good news! Your claim for "${recentOutcome.weather_event}" has been verified and ₹${recentOutcome.payout_amount} is now in your dashboard wallet.` : `Review Notes: ${recentOutcome.notes || 'Evidence mismatch detected by AI audit.'}`}
                      </p>
                   </div>
                </div>
                <button className="btn btn-ghost btn-square btn-xs" style={{opacity: 0.6}} title="Dismiss Notification">×</button>
             </div>
          </div>
        ))}

        {/* Weather Disruption Alert */}
        {weather?.is_disruption && (
          <div className="weather-alert alert-extreme animate-in" style={{marginBottom:'24px',borderRadius:'var(--radius-md)',padding:'16px 20px'}}>
            <AlertTriangle size={20} />
            <div>
              <strong>⚡ Disruption Detected: {weather.disruption_type}</strong>
              <span style={{marginLeft:'12px',fontSize:'0.82rem'}}>Protection active. Proceed with safety!</span>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-glow" style={{background:'#667eea'}} />
            <div className="stat-icon" style={{background:'rgba(102,126,234,0.15)'}}><Shield size={22} style={{color:'#667eea'}} /></div>
            <div className="stat-value">{policy ? policy.plan_name : '—'}</div>
            <div className="stat-label">Active Plan</div>
            <div className="stat-change">
              <span className={`badge ${policy?.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                <span className="pulse-dot" />{policy?.status || 'None'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-glow" style={{background: risk.color}} />
            <div className="stat-icon" style={{background: risk.bg}}><TrendingUp size={22} style={{color: risk.color}} /></div>
            <div className="stat-value" style={{color: risk.color}}>{profile.risk_score || 50}</div>
            <div className="stat-label">Risk Score</div>
            <div className="stat-change" style={{color: risk.color}}>{risk.label}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-glow" style={{background:'#f093fb'}} />
            <div className="stat-icon" style={{background:'rgba(240,147,251,0.15)'}}><FileText size={22} style={{color:'#f093fb'}} /></div>
            <div className="stat-value">{claims.length}</div>
            <div className="stat-label">Total Claims</div>
            <div className="stat-change" style={{color:'var(--accent-amber)'}}>
              {activeClaims > 0 ? `${activeClaims} pending` : 'All settled'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-glow" style={{background:'#00e676'}} />
            <div className="stat-icon" style={{background:'rgba(0,230,118,0.1)'}}><Wallet size={22} style={{color:'#00e676'}} /></div>
            <div className="stat-value" style={{color:'#00e676'}}>₹{totalPayout.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Payouts Received</div>
            <div className="stat-change stat-up">↑ This month</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid-65-35">
          {/* Left: Weather + Claims */}
          <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
            {/* Weather card */}
            <div className="weather-widget animate-in">
              <div className="weather-orb" />
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div className="weather-city">📍 {weather?.city || profile.city} — Live Weather</div>
                  {weatherLoading ? (
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <div className="skeleton" style={{width:120,height:60,borderRadius:8}} />
                    </div>
                  ) : weather ? (
                    <>
                      <div className="weather-temp">{weather.temperature}°C</div>
                      <div style={{fontSize:'0.88rem',color:'var(--text-muted)',textTransform:'capitalize',marginBottom:'16px'}}>{weather.description}</div>
                      <div className="weather-metrics">
                        <div className="weather-metric"><Droplets size={14} />{weather.humidity}% humidity</div>
                        <div className="weather-metric"><CloudRain size={14} />{weather.rainfall_mm}mm/hr rain</div>
                        <div className="weather-metric"><Wind size={14} />{weather.wind_speed}km/h wind</div>
                        <div className="weather-metric"><Thermometer size={14} />Feels {weather.feels_like}°C</div>
                      </div>
                      {weather.alert_level !== 'none' && (
                        <div className={`weather-alert alert-${weather.alert_level}`} style={{marginTop:'16px'}}>
                          <AlertTriangle size={16} />
                          Alert Level: <strong>{weather.alert_level?.toUpperCase()}</strong>
                          {weather.disruption_type && ` — ${weather.disruption_type}`}
                        </div>
                      )}
                    </>
                  ) : <div style={{color:'var(--text-muted)'}}>Weather unavailable</div>}
                </div>
                {weather && !weatherLoading && (
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'4rem'}}>{getWeatherEmoji(weather)}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text-dim)'}}>Updated {new Date(weather.fetched_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Claims */}
            <div className="card">
              <div className="card-header" style={{paddingBottom:'16px'}}>
                <div className="section-header" style={{marginBottom:0}}>
                  <span className="section-title">⚡ Recent Claims</span>
                  <span className="section-action" onClick={() => navigate('/claims')}>View all →</span>
                </div>
              </div>
              <div className="card-body" style={{paddingTop:'16px'}}>
                {claims.length === 0 ? (
                  <div className="empty-state" style={{padding:'40px 0'}}>
                    <div className="empty-icon">⚡</div>
                    <div className="empty-title">No claims yet</div>
                    <p className="empty-text">Claims auto-trigger when weather disruptions are detected in your zone.</p>
                  </div>
                ) : (
                  <div className="timeline">
                    {claims.slice(0, 5).map(claim => (
                      <div key={claim.id} className="timeline-item">
                        <div className="timeline-dot" style={{background: claim.status === 'paid' ? 'rgba(0,230,118,0.2)' : 'rgba(255,171,0,0.2)'}}>
                          {claim.trigger_type === 'auto' ? '⚡' : '📝'}
                        </div>
                        <div className="timeline-content">
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <div className="timeline-title">{claim.weather_event || 'Manual Claim'}</div>
                              <div className="timeline-meta">
                                <span>{new Date(claim.triggered_at).toLocaleDateString('en-IN')}</span>
                                <span className={`badge ${claim.status === 'paid' ? 'badge-green' : claim.status === 'triggered' ? 'badge-amber' : claim.status === 'rejected' ? 'badge-coral' : 'badge-blue'}`}>
                                {(() => {
                                  if (claim.status === 'paid') return 'Approved & Paid'
                                  if (claim.status === 'verified') return 'Approved'
                                  if (claim.status === 'triggered') return 'Review Pending'
                                  return claim.status.charAt(0).toUpperCase() + claim.status.slice(1)
                                })()}
                                </span>
                                <span className="badge badge-gray">{claim.trigger_type}</span>
                              </div>
                            </div>
                            <div className="timeline-amount">+₹{claim.payout_amount}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Policy + Quick Actions */}
          <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
            {/* Policy Card */}
            {policy ? (
              <div className="card card-glow animate-in" style={{background:'linear-gradient(135deg,rgba(102,126,234,0.12),rgba(118,75,162,0.12))'}}>
                <div className="card-body">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
                    <div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-muted)',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}}>Active Policy</div>
                      <div style={{fontFamily:'Outfit',fontSize:'1.5rem',fontWeight:800}}>{policy.plan_name} Plan</div>
                    </div>
                    <div style={{fontSize:'2rem'}}>{policy.plan_name === 'Basic' ? '🛡️' : policy.plan_name === 'Standard' ? '⚡' : '👑'}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'14px'}}>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:'6px'}}>Weekly Premium</div>
                      <div style={{fontFamily:'Outfit',fontSize:'1.4rem',fontWeight:700,color:'var(--accent-amber)'}}>₹{policy.weekly_premium}</div>
                    </div>
                    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'14px'}}>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:'6px'}}>Max Coverage</div>
                      <div style={{fontFamily:'Outfit',fontSize:'1.4rem',fontWeight:700,color:'var(--accent-green)'}}>₹{policy.coverage_amount}</div>
                    </div>
                  </div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:'16px'}}>
                    Valid: {new Date(policy.start_date).toLocaleDateString('en-IN')} — {new Date(policy.end_date).toLocaleDateString('en-IN')}
                  </div>
                  <button className="btn btn-ghost btn-full btn-sm" onClick={() => navigate('/policy')}>Manage Policy →</button>
                </div>
              </div>
            ) : (
              <div className="card animate-in">
                <div className="card-body" style={{textAlign:'center',padding:'32px 24px'}}>
                  <div style={{fontSize:'2rem',marginBottom:'12px'}}>🛡️</div>
                  <div style={{fontWeight:700,marginBottom:'8px'}}>No Active Policy</div>
                  <p className="text-muted text-sm" style={{marginBottom:'20px'}}>Subscribe to a plan to start getting weather-triggered payouts.</p>
                  <button className="btn btn-primary btn-full" onClick={() => navigate('/policy')}>View Plans</button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header"><div className="section-title">⚡ Quick Actions</div></div>
              <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'10px',paddingTop:'16px'}}>
                <button id="dash-auto-check" className={`btn btn-primary btn-full ${claimLoading?'btn-loading':''}`} onClick={() => triggerClaim('auto')} disabled={claimLoading || !policy}>
                  🌧️ Check & Auto-Claim Now
                </button>
                <button id="dash-manual-claim-2" className="btn btn-amber btn-full" onClick={() => triggerClaim('manual')} disabled={claimLoading || !policy}>
                  📝 File Manual Claim
                </button>
                <button className="btn btn-ghost btn-full" onClick={() => navigate('/payments')}>
                  <Wallet size={16} /> View Payment History
                </button>
              </div>
            </div>

            {/* Risk Info */}
            <div className="card" style={{background: risk.bg, border:`1px solid ${risk.color}30`}}>
              <div className="card-body" style={{padding:'20px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                  <div style={{fontSize:'1.5rem'}}>🎯</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.9rem'}}>{risk.label}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Based on {profile.city} weather history</div>
                  </div>
                </div>
                <div style={{height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'var(--radius-full)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${profile.risk_score || 50}%`,background:risk.color,borderRadius:'var(--radius-full)',transition:'width 1s ease'}} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',color:'var(--text-dim)',marginTop:'6px'}}>
                  <span>Low Risk (0)</span><span>High Risk (100)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getWeatherEmoji = (w) => {
  if (!w) return '🌤️'
  if (w.rainfall_mm > 20) return '⛈️'
  if (w.rainfall_mm > 5) return '🌧️'
  if (w.rainfall_mm > 0) return '🌦️'
  if (w.temperature > 40) return '🥵'
  if (w.wind_speed > 50) return '🌀'
  return '☀️'
}
