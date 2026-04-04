import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { upsertProfile, createPolicy } from '../services/supabaseClient'
import { calculateRiskScore, getInsurancePlans, calculatePremium } from '../services/riskEngine'
import { fetchWeatherByCity, fetchWeatherByCoords, CITY_COORDS } from '../services/weatherService'
import { User, MapPin, Briefcase, Shield, Check, Loader, QrCode, Search } from 'lucide-react'
import { getCitySuggestions } from '../services/cityService'

const CITIES = Object.keys(CITY_COORDS)
const PLATFORMS = ['Swiggy', 'Zomato', 'Zepto', 'Blinkit', 'Amazon', 'Dunzo', 'Other']
const DELIVERY_TYPES = [
  { value: 'food', label: '🍔 Food Delivery' },
  { value: 'grocery', label: '🛒 Grocery / Quick Commerce' },
  { value: 'ecommerce', label: '📦 E-Commerce Parcels' },
  { value: 'other', label: '🏍️ Other Delivery' },
]

const STEPS = [
  { id: 1, label: 'Personal Info', icon: <User size={15} /> },
  { id: 2, label: 'Work Details', icon: <Briefcase size={15} /> },
]

export default function Register() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [error, setError] = useState('')
  const [weather, setWeather] = useState(null)
  const [riskScore, setRiskScore] = useState(50)
  const [selectedPlan, setSelectedPlan] = useState('Standard')

  const [form, setForm] = useState({
    full_name: '', phone: '', city: 'Mumbai', pincode: '',
    delivery_type: 'food', platform: 'Swiggy',
    gps_lat: null, gps_lng: null,
    is_tracking_enabled: true
  })

  // City Autocomplete states
  const [citySuggestions, setCitySuggestions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }))
  
  useEffect(() => {
    // Auto-capture location on start if possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const w = await fetchWeatherByCoords(lat, lng);
          if (w.city) {
            setForm(f => ({ ...f, gps_lat: lat, gps_lng: lng, city: w.city }));
          } else {
            setForm(f => ({ ...f, gps_lat: lat, gps_lng: lng }));
          }
        } catch {
          setForm(f => ({ ...f, gps_lat: lat, gps_lng: lng }));
        }
      }, () => {})
    }
  }, [])

  // Debounced City Suggestion
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only fetch if typing at least 3 chars and user actually typed (not from auto-fill/select)
      // We check showSuggestions to only trigger while user is focused and typing
      if (form.city.length >= 3 && showSuggestions) {
        setCityLoading(true)
        const suggestions = await getCitySuggestions(form.city)
        setCitySuggestions(suggestions)
        setCityLoading(false)
      } else {
        setCitySuggestions([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.city, showSuggestions])

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Please enter your full name')
    if (!form.phone.match(/^[6-9]\d{9}$/)) return setError('Enter a valid 10-digit Indian mobile number')
    setError('')
    setStep(2)
  }

  const handleStep2 = async (e) => {
    e.preventDefault()
    setError('')
    setWeatherLoading(true)
    try {
      const w = await fetchWeatherByCity(form.city)
      setWeather(w)
      const score = calculateRiskScore({ city: form.city, delivery_type: form.delivery_type, platform: form.platform, weather: w })
      setRiskScore(score)
      // Call finish directly since steps are removed
      await finishRegistration(score)
    } catch (err) {
      setError('Could not fetch weather data. Using estimated risk score.')
      const score = calculateRiskScore({ city: form.city, delivery_type: form.delivery_type, platform: form.platform })
      setRiskScore(score)
      await finishRegistration(score)
    } finally {
      setWeatherLoading(false)
    }
  }

  const finishRegistration = async (actualRiskScore) => {
    setLoading(true); setError('')
    try {
      // 🎯 Fix: Define currentRisk at the top so it exists for the policy
      const currentRisk = actualRiskScore || riskScore;
      const coords = CITY_COORDS[form.city] || {}

      // 1. Create the policy FIRST to get an ID
      const premium = calculatePremium('Standard', currentRisk)
      const policyData = {
        worker_id: user.id || 'anonymous',
        plan_name: 'Standard',
        weekly_premium: premium,
        coverage_amount: 500,
        status: 'active',
      }
      const { data: policyCreated, error: polErr } = await createPolicy(policyData)
      if (polErr) {
        console.error("Supabase Policy Error:", polErr);
        throw polErr;
      }

      // 2. Now save the profile with the policy ID in ONE go
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: form.full_name,
        phone: form.phone,
        city: form.city,
        pincode: form.pincode,
        delivery_type: form.delivery_type,
        platform: form.platform,
        gps_lat: form.gps_lat || coords.lat,
        gps_lng: form.gps_lng || coords.lon,
        is_tracking_enabled: form.is_tracking_enabled,
        risk_score: currentRisk,
        wallet_balance: 0,
        total_payouts: 0,
        active_policy_id: policyCreated.id // Link it here!
      }

      const { data: profileSaved, error: profileErr } = await upsertProfile(profileData)
      if (profileErr) {
        console.error("Supabase Profile Error:", profileErr);
        throw profileErr;
      }

      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      console.error("Registration full error:", err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false)
    }
  }

  const plans = getInsurancePlans(riskScore)
  const riskColor = riskScore >= 70 ? '#ff5252' : riskScore >= 50 ? '#ffab00' : '#00e676'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Setup</h1>
          <p className="page-subtitle">Complete your registration to activate GigShield insurance</p>
        </div>
      </div>

      <div className="page-body" style={{maxWidth:'700px', margin:'0 auto'}}>
        {/* Step Progress */}
        <div className="step-progress animate-in" style={{marginBottom:'40px'}}>
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center" style={{flex:1}}>
              <div className="step-item">
                <div className={`step-circle ${step > s.id ? 'done' : step === s.id ? 'active' : ''}`}>
                  {step > s.id ? <Check size={16} /> : s.icon}
                </div>
                <span className="step-label" style={{color: step === s.id ? 'var(--primary)' : step > s.id ? 'var(--accent-green)' : 'var(--text-dim)'}}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-connector ${step > s.id ? 'done' : ''}`} style={{flex:1, margin:'0 8px'}} />}
            </div>
          ))}
        </div>

        {error && <div className="toast toast-error" style={{position:'relative',bottom:'auto',right:'auto',marginBottom:'20px'}}><span>⚠️</span>{error}</div>}

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="card animate-in">
            <div className="card-body">
              <h2 style={{fontFamily:'Outfit',fontSize:'1.3rem',fontWeight:700,marginBottom:'8px'}}>👤 Personal Details</h2>
              <p className="text-muted text-sm" style={{marginBottom:'28px'}}>Tell us who you are — this helps verify your account and payouts.</p>
              <form onSubmit={handleStep1}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input id="reg-name" type="text" className="form-input" placeholder="Ravi Kumar" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <div className="input-group">
                      <span className="input-icon" style={{fontSize:'0.85rem',fontWeight:700}}>🇮🇳</span>
                      <input id="reg-phone" type="tel" className="form-input" placeholder="9876543210" maxLength={10} value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g,''))} required />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <div className="input-group" style={{position:'relative'}}>
                      <Search size={16} className="input-icon" />
                      <input 
                        id="reg-city"
                        type="text" 
                        className="form-input" 
                        placeholder="Type your city (e.g. Hyderabad)" 
                        value={form.city}
                        onChange={e => {
                          update('city', e.target.value)
                          setShowSuggestions(true)
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        autoComplete="off"
                      />
                      
                      {/* Suggestion Dropdown */}
                      {showSuggestions && (cityLoading || citySuggestions.length > 0) && (
                        <div className="autocomplete-dropdown">
                          {cityLoading ? (
                            <div className="autocomplete-item"><Loader size={12} className="animate-spin" /> Searching...</div>
                          ) : (
                            citySuggestions.map((s, idx) => (
                              <div 
                                key={idx} 
                                className="autocomplete-item"
                                onMouseDown={(e) => {
                                  // Use onMouseDown to trigger before onBlur
                                  e.preventDefault(); 
                                  update('city', s.label)
                                  update('gps_lat', s.lat)
                                  update('gps_lng', s.lon)
                                  setShowSuggestions(false)
                                  setCitySuggestions([])
                                }}
                              >
                                <MapPin size={12} style={{marginRight:8}} /> {s.label}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Live Location Verified</label>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-full ${weatherLoading ? 'btn-loading' : ''}`}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('Geolocation not supported by your browser');
                          return;
                        }
                        setWeatherLoading(true)
                        navigator.geolocation.getCurrentPosition(
                          async (pos) => {
                            const lat = pos.coords.latitude;
                            const lng = pos.coords.longitude;
                            update('gps_lat', lat);
                            update('gps_lng', lng);
                            try {
                              const w = await fetchWeatherByCoords(lat, lng);
                              if (w.city) update('city', w.city);
                              alert(`📍 Location Verified: ${w.city || 'Custom Area'}`);
                            } catch {
                              alert(`📍 Coords Verified: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                            } finally {
                              setWeatherLoading(false);
                            }
                          },
                          (err) => {
                            alert('Location access denied. Please type your city manually.');
                            setWeatherLoading(false);
                          }
                        );
                      }}
                    >
                      <MapPin size={16} /> {form.gps_lat ? 'Location Verified' : 'Verify My Location'}
                    </button>
                    {form.gps_lat && <div className="text-xs text-green mt-8">✓ Lat: {form.gps_lat.toFixed(4)} / Lng: {form.gps_lng.toFixed(4)}</div>}
                  </div>
                </div>

                <div className="card mb-16" style={{background: 'rgba(102,126,234,0.05)', border: '1px dashed var(--primary)'}}>
                  <div className="card-body" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px'}}>
                    <div>
                      <h4 style={{fontSize: '0.9rem', fontWeight: 700}}>🛰️ Enable Live Tracking</h4>
                      <p className="text-xs text-muted">Auto-trigger claims when you enter storm zones.</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={form.is_tracking_enabled} 
                        onChange={e => update('is_tracking_enabled', e.target.checked)} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <button id="reg-step1-next" type="submit" className="btn btn-primary btn-full btn-lg" style={{marginTop:'8px'}}>
                  Continue <span>→</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 2: Work Details ── */}
        {step === 2 && (
          <div className="card animate-in">
            <div className="card-body">
              <h2 style={{fontFamily:'Outfit',fontSize:'1.3rem',fontWeight:700,marginBottom:'8px'}}>🏍️ Work Details</h2>
              <p className="text-muted text-sm" style={{marginBottom:'28px'}}>Your delivery type affects your risk score and premium calculation.</p>
              <form onSubmit={handleStep2}>
                <div className="form-group">
                  <label className="form-label">Type of Delivery *</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'8px'}}>
                    {DELIVERY_TYPES.map(d => (
                      <div
                        key={d.value}
                        onClick={() => update('delivery_type', d.value)}
                        style={{
                          padding:'14px 16px', borderRadius:'var(--radius-md)', cursor:'pointer',
                          border: form.delivery_type === d.value ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                          background: form.delivery_type === d.value ? 'rgba(102,126,234,0.1)' : 'var(--bg-card)',
                          transition:'var(--transition)', fontSize:'0.88rem', fontWeight:500,
                        }}
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Platform / Employer *</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
                    {PLATFORMS.map(p => (
                      <div
                        key={p}
                        onClick={() => update('platform', p)}
                        style={{
                          padding:'10px 8px', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'center',
                          border: form.platform === p ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                          background: form.platform === p ? 'rgba(102,126,234,0.1)' : 'var(--bg-card)',
                          transition:'var(--transition)', fontSize:'0.8rem', fontWeight:500,
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button id="reg-finish-btn" type="submit" className={`btn btn-primary flex-1 ${weatherLoading || loading ? 'btn-loading' : ''}`} disabled={weatherLoading || loading}>
                    {weatherLoading || loading ? 'Activating Profile…' : '🚀 Activate My Shield Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
