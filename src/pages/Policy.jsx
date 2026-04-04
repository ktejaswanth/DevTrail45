import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPolicies, createPolicy } from '../services/supabaseClient'
import { getInsurancePlans, calculatePremium, getCoverageAmount } from '../services/riskEngine'
import { fetchWeatherByCity } from '../services/weatherService'
import { verifyUPIPayment } from '../services/paymentService'
import { Shield, Check, Zap, RefreshCw, Smartphone, QrCode } from 'lucide-react'

export default function Policy() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(null)
  const [weather, setWeather] = useState(null)
  const [toast, setToast] = useState(null)
  
  // UPI Payment Modal state
  const [showPayModal, setShowPayModal] = useState(false)
  const [payPlan, setPayPlan] = useState(null)
  const [payPremium, setPayPremium] = useState(0)
  const [verifying, setVerifying] = useState(false)

  const riskScore = profile?.risk_score || 50
  const plans = getInsurancePlans(riskScore)

  const showToast = (msg, type='success') => {
    setToast({msg,type})
    setTimeout(()=>setToast(null),4000)
  }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const [{ data: pols }, w] = await Promise.all([
        getPolicies(user.id),
        fetchWeatherByCity(profile?.city || 'Mumbai').catch(()=>null)
      ])
      setPolicies(pols || [])
      setWeather(w)
      setLoading(false)
    }
    load()
  }, [user, profile])

  const openPaymentModal = (plan) => {
    const premium = calculatePremium(plan.name, riskScore)
    setPayPlan(plan)
    setPayPremium(premium)
    setShowPayModal(true)
  }

  const handleVerifyAndSubscribe = async () => {
    if (!user || !payPlan) return
    setVerifying(true)
    try {
      // Simulate UPI QR Verification
      const res = await verifyUPIPayment(payPremium);
      if (!res.success) throw new Error("Payment verification failed");

      const coverage = getCoverageAmount(payPlan.name)
      const { error } = await createPolicy({
        worker_id: user.id,
        plan_name: payPlan.name,
        weekly_premium: payPremium,
        coverage_amount: coverage,
        status: 'active',
      })
      if (error) throw error
      
      showToast(`🛡️ ${payPlan.name} plan activated successfully! ₹${payPremium}/week paid via UPI.`)
      
      // Reset Modal
      setShowPayModal(false)
      setPayPlan(null)

      // Refresh Policies
      const { data } = await getPolicies(user.id)
      setPolicies(data || [])
    } catch (err) {
      showToast(err.message || 'Verification failed', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const activePolicy = policies.find(p => p.status === 'active')

  if (loading) return <div className="loading-container"><div className="loader" /></div>

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* UPI PAYMENT MODAL */}
      {showPayModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(7,9,26,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} className="animate-fade">
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, marginBottom: '8px' }}>⚡ UPI Quick Pay</h2>
            <p className="text-muted text-sm mb-24">Scan the QR code to pay for your <strong>{payPlan.name}</strong> Plan.</p>
            
            <div style={{
              background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', 
              display: 'inline-block', marginBottom: '24px', boxShadow: '0 0 40px rgba(102,126,234,0.15)'
            }}>
              <div style={{width:'200px',height:'200px',background:'#eee',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'4px'}}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gigshield@upi%26pn=GigShield%20Insurance%26am=${payPremium}%26cu=INR`} alt="UPI QR" style={{width:'100%',height:'100%'}} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Amount to Pay:</div>
              <div style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 900, color: 'var(--accent-green)' }}>₹{payPremium}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>UPI ID: gigshield@upi</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className={`btn btn-green btn-full btn-lg ${verifying ? 'btn-loading' : ''}`}
                onClick={handleVerifyAndSubscribe}
                disabled={verifying}
              >
                {verifying ? 'Verifying Transaction...' : '✓ Done, Activate Plan'}
              </button>
              <button 
                className="btn btn-ghost btn-full"
                onClick={() => setShowPayModal(false)}
                disabled={verifying}
              >
                Cancel
              </button>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6 }}>
              <Smartphone size={14} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Pay using Google Pay, PhonePe, or Paytm</span>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Insurance Policy</h1>
          <p className="page-subtitle">View and manage your GigShield coverage plans</p>
        </div>
        {activePolicy && (
          <div className="badge badge-green" style={{padding:'8px 16px',fontSize:'0.8rem'}}>
            <span className="pulse-dot" /> Active Coverage
          </div>
        )}
      </div>

      <div className="page-body">
        {/* Active Policy Banner */}
        {activePolicy && (
          <div className="card animate-in" style={{marginBottom:'32px',background:'linear-gradient(135deg,rgba(0,230,118,0.08),rgba(0,188,212,0.08))',border:'1px solid rgba(0,230,118,0.2)'}}>
            <div className="card-body" style={{display:'flex',alignItems:'center',gap:'24px',flexWrap:'wrap'}}>
              <div style={{fontSize:'3rem'}}>{activePolicy.plan_name === 'Basic' ? '🛡️' : activePolicy.plan_name === 'Standard' ? '⚡' : '👑'}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Outfit',fontSize:'1.4rem',fontWeight:800,marginBottom:'4px'}}>
                  {activePolicy.plan_name} Plan <span className="badge badge-green" style={{fontSize:'0.65rem'}}>Active</span>
                </div>
                <div style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>
                  Valid from <strong>{new Date(activePolicy.start_date).toLocaleDateString('en-IN')}</strong> to <strong>{new Date(activePolicy.end_date).toLocaleDateString('en-IN')}</strong>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Outfit',fontSize:'1.6rem',fontWeight:800,color:'var(--accent-amber)'}}>₹{activePolicy.weekly_premium}</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Weekly Premium</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Outfit',fontSize:'1.6rem',fontWeight:800,color:'var(--accent-green)'}}>₹{activePolicy.coverage_amount}</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Max Payout</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Risk Summary */}
        <div className="card mb-24 animate-in" style={{background:'linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08))'}}>
          <div className="card-body">
            <div style={{display:'flex',gap:'24px',alignItems:'center',flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Your AI Risk Score</div>
                <div style={{fontFamily:'Outfit',fontSize:'3rem',fontWeight:800,color:riskScore>=70?'var(--accent-coral)':riskScore>=50?'var(--accent-amber)':'var(--accent-green)'}}>{riskScore}</div>
                <div style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:'4px'}}>
                  Based on: {profile?.city} · {profile?.delivery_type} · {profile?.platform}
                </div>
              </div>
              {weather && (
                <div style={{flex:1,padding:'16px',background:'var(--bg-card)',borderRadius:'var(--radius-md)',minWidth:'220px'}}>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:'10px',fontWeight:600}}>📡 Live Weather — {profile?.city}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'0.8rem'}}>
                    <span>🌡️ {weather.temperature}°C ({weather.description})</span>
                    <span>🌧️ Rainfall: {weather.rainfall_mm}mm/hr</span>
                    <span>💨 Wind: {weather.wind_speed}km/h</span>
                    <span>💧 Humidity: {weather.humidity}%</span>
                  </div>
                  {weather.is_disruption && (
                    <div style={{marginTop:'10px',padding:'8px 12px',background:'rgba(255,82,82,0.1)',border:'1px solid rgba(255,82,82,0.25)',borderRadius:'var(--radius-sm)',fontSize:'0.78rem',color:'var(--accent-coral)',fontWeight:600}}>
                      ⚠️ Disruption Active: {weather.disruption_type}
                    </div>
                  )}
                </div>
              )}
              <div style={{fontSize:'0.8rem',color:'var(--text-muted)',maxWidth:'200px',lineHeight:1.6}}>
                💡 Higher risk score means slightly higher premium but also indicates you're in a high-disruption zone — making insurance more valuable!
              </div>
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <h2 style={{fontFamily:'Outfit',fontSize:'1.2rem',fontWeight:700,marginBottom:'20px'}}>
          {activePolicy ? '🔄 Switch or Upgrade Your Plan' : '🛡️ Choose a Protection Plan'}
        </h2>
        <div className="plans-grid">
          {plans.map(plan => {
            const isActive = activePolicy?.plan_name === plan.name
            return (
              <div key={plan.name} className={`plan-card ${isActive ? 'card-glow' : ''}`} style={{
                border: isActive ? `2px solid ${plan.color}` : '1px solid var(--glass-border)',
                boxShadow: isActive ? `0 0 40px ${plan.color}25` : 'none',
              }}>
                {plan.recommended && !isActive && <div className="plan-recommended-badge">⭐ Recommended</div>}
                {isActive && <div className="plan-recommended-badge" style={{background:'var(--grad-green)'}}>✓ Active Plan</div>}
                <div className="plan-card-glow" style={{background:plan.color}} />
                <span className="plan-emoji">{plan.emoji}</span>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price" style={{color:plan.color}}>₹{plan.weekly_premium}</div>
                <div className="plan-price-period">per week <span style={{color:'var(--text-dim)',fontSize:'0.7rem'}}>(AI-adjusted: risk {riskScore})</span></div>
                <div className="plan-coverage">Coverage up to: <strong>₹{plan.coverage_amount}</strong></div>
                <ul className="plan-features">
                  {plan.features.map(f=>(
                    <li key={f} className="plan-feature"><span className="plan-feature-check">✓</span>{f}</li>
                  ))}
                </ul>
                {isActive ? (
                  <div style={{padding:'12px',textAlign:'center',borderRadius:'var(--radius-md)',background:`${plan.color}15`,border:`1px solid ${plan.color}30`,color:plan.color,fontWeight:700,fontSize:'0.88rem'}}>
                    <Check size={15} style={{display:'inline',marginRight:'6px'}} /> Currently Active
                  </div>
                ) : (
                  <button
                    id={`policy-subscribe-${plan.name.toLowerCase()}`}
                    className={`btn btn-full`}
                    style={{background:plan.color,color:'white',boxShadow:`0 4px 15px ${plan.color}40`}}
                    onClick={() => openPaymentModal(plan)}
                  >
                    Activate {plan.name} Plan
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Comparison Table */}
        <div className="card animate-in" style={{marginTop:'32px'}}>
          <div className="card-header" style={{paddingBottom:'16px'}}>
            <div className="section-title">📊 Full Coverage Comparison</div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th style={{color:'#667eea'}}>🛡️ Basic</th>
                  <th style={{color:'#764ba2'}}>⚡ Standard</th>
                  <th style={{color:'#f093fb'}}>👑 Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Weekly Premium (base)', '₹30', '₹40', '₹50'],
                  ['Max Payout per Event', '₹300', '₹500', '₹800'],
                  ['Rain Trigger (>20mm)', '✓', '✓', '✓'],
                  ['Heatwave Trigger (>42°C)', '✗', '✓', '✓'],
                  ['Windstorm Trigger (>60km/h)', '✗', '✓', '✓'],
                  ['AQI / Pollution Cover', '✗', '✗', '✓'],
                  ['Claims per Week', '1', '2', 'Unlimited'],
                  ['Payout Speed', '4–6 hrs', '2–4 hrs', '< 2 hrs'],
                  ['Manual Claim Button', '✗', '✓', '✓'],
                  ['GPS Fraud Detection', '✓', '✓', '✓'],
                ].map(([feat,...vals])=>(
                  <tr key={feat}>
                    <td style={{fontWeight:500}}>{feat}</td>
                    {vals.map((v,i)=>(
                      <td key={i} style={{color: v==='✓'?'var(--accent-green)':v==='✗'?'var(--accent-coral)':undefined, fontWeight: v.startsWith('₹')?700:undefined}}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Policy History */}
        {policies.length > 1 && (
          <div className="card animate-in" style={{marginTop:'24px'}}>
            <div className="card-header"><div className="section-title">📋 Policy History</div></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Plan</th><th>Premium</th><th>Coverage</th><th>Status</th><th>Valid From</th><th>Valid To</th></tr></thead>
                <tbody>
                  {policies.map(p=>(
                    <tr key={p.id}>
                      <td style={{fontWeight:600}}>{p.plan_name}</td>
                      <td>₹{p.weekly_premium}/wk</td>
                      <td>₹{p.coverage_amount}</td>
                      <td><span className={`badge ${p.status==='active'?'badge-green':p.status==='expired'?'badge-gray':'badge-amber'}`}>{p.status}</span></td>
                      <td>{new Date(p.start_date).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(p.end_date).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
