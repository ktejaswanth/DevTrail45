import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getClaims, createClaim, createPayment, updateClaimStatus, getPolicies, upsertProfile } from '../services/supabaseClient'
import { fetchWeatherByCity, fetchWeatherByCoords } from '../services/weatherService'
import { calculatePayout } from '../services/riskEngine'
import { Zap, RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle, CloudRain } from 'lucide-react'

const STATUS_MAP = {
  triggered: { label: 'Triggered',  color: 'badge-amber', icon: <Clock size={12} /> },
  verified:  { label: 'Verified',   color: 'badge-blue',  icon: <Zap size={12} /> },
  paid:      { label: 'Paid',       color: 'badge-green', icon: <CheckCircle size={12} /> },
  rejected:  { label: 'Rejected',   color: 'badge-coral', icon: <XCircle size={12} /> },
}

export default function Claims() {
  const { user, profile } = useAuth()
  const [claims, setClaims] = useState([])
  const [policy, setPolicy] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [manualReason, setManualReason] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [liveLocation, setLiveLocation] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),4500)
  }

  const loadData = useCallback(async (lat = null, lng = null) => {
    if (!user) return
    setLoading(true)
    
    let w;
    try {
      if (lat && lng) {
        w = await fetchWeatherByCoords(lat, lng, profile?.city || 'Custom')
      } else if (profile?.gps_lat && profile?.gps_lng) {
        w = await fetchWeatherByCoords(profile.gps_lat, profile.gps_lng, profile.city)
      } else {
        w = await fetchWeatherByCity(profile?.city || 'Mumbai')
      }
    } catch {
      w = null
    }

    const [{ data: claimsData }, { data: policies }] = await Promise.all([
      getClaims(user.id),
      getPolicies(user.id),
    ])
    
    setClaims(claimsData || [])
    setPolicy(policies?.find(p => p.status === 'active') || null)
    setWeather(w)
    setLoading(false)
  }, [user, profile])

  const syncLiveLocation = useCallback(async () => {
    if (!navigator.geolocation || !profile) return
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      setLiveLocation({ lat, lng })
      
      if (lat !== profile.gps_lat || lng !== profile.gps_lng) {
        try {
          await upsertProfile({ ...profile, gps_lat: lat, gps_lng: lng })
        } catch {
          console.error("Failed to update profile location")
        }
      }
      loadData(lat, lng)
    }, () => {
      console.warn("Location permission denied on claims page")
      loadData()
    })
  }, [profile, loadData])

  useEffect(() => { 
    if (profile) syncLiveLocation()
    else loadData()
  }, [profile, syncLiveLocation])

  const triggerClaim = async (type = 'auto') => {
    if (!policy) return showToast('No active policy. Please subscribe first.', 'error')
    setClaimLoading(true)
    try {
      const payout = calculatePayout(policy, weather || { alert_level: 'medium', rainfall_mm: 5, temperature: 30 })
      const { data: claim, error: claimErr } = await createClaim({
        policy_id: policy.id,
        worker_id: user.id,
        trigger_type: type,
        weather_event: type === 'auto' ? (weather?.disruption_type || 'Weather Disruption') : `Manual: ${manualReason || 'Worker request'}`,
        weather_data: weather,
        payout_amount: payout,
        status: 'triggered',
        worker_lat: profile?.gps_lat,
        worker_lng: profile?.gps_lng,
        fraud_score: 0,
        notes: type === 'manual' ? manualReason : null,
      })
      if (claimErr) throw claimErr

      showToast('⏳ Claim submitted and being audited by AI...', 'info')
      // Removed instant verification and payment - now waits for admin review
      setManualReason('')
      setShowManual(false)
      loadData()
    } catch (err) {
      showToast(err.message || 'Claim failed', 'error')
    } finally {
      setClaimLoading(false)
    }
  }

  const paidClaims = claims.filter(c=>c.status==='paid')
  const totalPaid  = paidClaims.reduce((s,c)=>s+Number(c.payout_amount||0),0)

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Insurance Claims</h1>
          <p className="page-subtitle">
            {liveLocation ? '🎯 Running live location verification' : '📍 ' + (profile?.city || 'Detecting area')} · Weather-based automatic payouts
          </p>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><RefreshCw size={14}/> Refresh</button>
          <button id="claims-manual-btn" className="btn btn-amber btn-sm" onClick={()=>setShowManual(true)} disabled={claimLoading||!policy}>
            📝 File Manual Claim
          </button>
          <button id="claims-auto-btn" className={`btn btn-primary btn-sm ${claimLoading?'btn-loading':''}`} onClick={()=>triggerClaim('auto')} disabled={claimLoading||!policy}>
            <Zap size={14}/> Auto-Trigger
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Row */}
        <div className="grid-3 mb-24">
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(102,126,234,0.15)'}}><Zap size={20} style={{color:'var(--primary)'}}/></div>
            <div className="stat-value">{claims.length}</div>
            <div className="stat-label">Total Claims Filed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(0,230,118,0.1)'}}><CheckCircle size={20} style={{color:'var(--accent-green)'}}/></div>
            <div className="stat-value">{paidClaims.length}</div>
            <div className="stat-label">Claims Paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(0,230,118,0.1)'}}><CloudRain size={20} style={{color:'var(--accent-green)'}}/></div>
            <div className="stat-value" style={{color:'var(--accent-green)'}}>₹{totalPaid.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Received</div>
          </div>
        </div>

        {/* Weather Alert Banner */}
        {weather?.is_disruption && (
          <div className="weather-alert alert-extreme animate-in" style={{borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'24px'}}>
            <AlertTriangle size={20}/>
            <div>
              <strong>⚡ Live Disruption: {weather.disruption_type}</strong>
              <span style={{marginLeft:'12px',fontSize:'0.82rem'}}>
                Rain: {weather.rainfall_mm}mm · Temp: {weather.temperature}°C — You're eligible for an auto-claim!
              </span>
            </div>
            <button
              className={`btn btn-amber btn-sm ${claimLoading?'btn-loading':''}`}
              onClick={()=>triggerClaim('auto')} style={{marginLeft:'auto'}} disabled={claimLoading||!policy}
            >
              Claim Now
            </button>
          </div>
        )}

        {/* Manual Claim Modal */}
        {showManual && (
          <div className="card animate-in" style={{marginBottom:'24px',border:'1px solid rgba(255,171,0,0.3)',background:'rgba(255,171,0,0.05)'}}>
            <div className="card-body">
              <h3 style={{fontFamily:'Outfit',fontWeight:700,marginBottom:'12px'}}>📝 File Manual Claim</h3>
              <p className="text-muted text-sm" style={{marginBottom:'16px'}}>
                Describe why you couldn't work today due to weather conditions. Our AI will verify your claim.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Claim</label>
                <textarea
                  id="manual-claim-reason"
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Heavy rain prevented delivery, roads flooded in my zone…"
                  value={manualReason}
                  onChange={e=>setManualReason(e.target.value)}
                  style={{resize:'vertical', minHeight:'80px'}}
                />
              </div>
              <div style={{display:'flex',gap:'12px'}}>
                <button className="btn btn-ghost" onClick={()=>{setShowManual(false);setManualReason('')}}>Cancel</button>
                <button
                  id="manual-claim-submit"
                  className={`btn btn-amber flex-1 ${claimLoading?'btn-loading':''}`}
                  onClick={()=>triggerClaim('manual')}
                  disabled={claimLoading||!manualReason.trim()}
                >
                  {claimLoading?'Processing…':'Submit Manual Claim'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claims List */}
        <div className="card">
          <div className="card-header" style={{paddingBottom:'16px'}}>
            <div className="section-header" style={{marginBottom:0}}>
              <span className="section-title">⚡ All Claims</span>
              <span className="text-muted text-sm">{claims.length} total</span>
            </div>
          </div>
          {loading ? (
            <div className="card-body">
              {[1,2,3].map(i=>(
                <div key={i} style={{display:'flex',gap:'16px',marginBottom:'16px'}}>
                  <div className="skeleton" style={{width:44,height:44,borderRadius:'50%',flexShrink:0}}/>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                    <div className="skeleton" style={{height:16,width:'60%'}}/>
                    <div className="skeleton" style={{height:12,width:'40%'}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="card-body">
              <div className="empty-state">
                <div className="empty-icon">⚡</div>
                <div className="empty-title">No claims yet</div>
                <p className="empty-text">Claims are automatically triggered when weather disruptions hit your zone. You can also file a manual claim above.</p>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event / Reason</th>
                    <th>Type</th>
                    <th>Date & Time</th>
                    <th>Weather Data</th>
                    <th>Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => {
                    const st = STATUS_MAP[claim.status] || STATUS_MAP.triggered
                    const wd = claim.weather_data
                    return (
                      <tr key={claim.id}>
                        <td>
                          <div style={{fontWeight:600,fontSize:'0.88rem'}}>{claim.weather_event || 'Manual Claim'}</div>
                          {claim.notes && <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'2px'}}>"{claim.notes}"</div>}
                        </td>
                        <td>
                          <span className={`badge ${claim.trigger_type==='auto'?'badge-blue':'badge-amber'}`}>
                            {claim.trigger_type==='auto'?'⚡ Auto':'📝 Manual'}
                          </span>
                        </td>
                        <td style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
                          {new Date(claim.triggered_at).toLocaleDateString('en-IN')}<br/>
                          {new Date(claim.triggered_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
                          {wd ? (
                            <div>
                              {wd.temperature}°C · {wd.rainfall_mm}mm rain<br/>
                              💨 {wd.wind_speed}km/h
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{fontFamily:'Outfit',fontWeight:700,fontSize:'1rem',color:'var(--accent-green)'}}>
                            +₹{claim.payout_amount}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${st.color}`} style={{display:'inline-flex',gap:'4px',alignItems:'center'}}>
                            {st.icon}{st.label}
                          </span>
                          {claim.paid_at && (
                            <div style={{fontSize:'0.68rem',color:'var(--text-dim)',marginTop:'3px'}}>
                              Paid {new Date(claim.paid_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How Claims Work */}
        <div className="card animate-in" style={{marginTop:'24px'}}>
          <div className="card-body">
            <h3 style={{fontFamily:'Outfit',fontWeight:700,marginBottom:'20px'}}>🔄 How Parametric Claims Work</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
              {[
                { icon:'🌧️', step:'1', title:'Weather Detected', desc:'OpenWeather API detects rain >20mm or temp >42°C in your zone' },
                { icon:'⚡', step:'2', title:'Auto-Trigger', desc:'System instantly creates a claim record — no forms needed' },
                { icon:'🔍', step:'3', title:'GPS Verified', desc:'AI validates your location matches the disruption zone' },
                { icon:'💸', step:'4', title:'Payout in 2hrs', desc:'Amount credited to your UPI within hours of the event' },
              ].map(s=>(
                <div key={s.step} style={{textAlign:'center',padding:'16px',background:'var(--bg-card)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:'2rem',marginBottom:'8px'}}>{s.icon}</div>
                  <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'var(--grad-primary)',color:'white',fontSize:'0.75rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>{s.step}</div>
                  <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'6px'}}>{s.title}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.5}}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
