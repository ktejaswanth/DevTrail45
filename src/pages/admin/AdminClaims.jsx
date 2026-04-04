import { useEffect, useState } from 'react'
import { getAllClaims, reviewClaim } from '../../services/adminService'
import { analyzeClaimForFraud } from '../../services/fraudEngine'
import { CheckCircle, XCircle, Search, Clock, Cpu, Filter, MapPin, Zap } from 'lucide-react'

const STATUS_CONFIG = {
  triggered: { label: 'Review Pending', color: 'badge-amber', icon: <Clock size={12} /> },
  verified: { label: 'Approved', color: 'badge-blue', icon: <CheckCircle size={12} /> },
  paid: { label: 'Approved & Paid', color: 'badge-green', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejected', color: 'badge-coral', icon: <XCircle size={12} /> },
}

export default function AdminClaims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeClaim, setActiveClaim] = useState(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiReport, setAiReport] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    const { data } = await getAllClaims()
    setClaims(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleReview = async (claimId, status, notes) => {
    const { error } = await reviewClaim(claimId, status, notes)
    if (!error) {
      showToast(`Claim ${status === 'verified' ? 'Approved' : 'Rejected'} Successfully!`)
      setActiveClaim(null); 
      setAiReport(null);
      fetchData()
    }
  }

  const runAiAnalysis = async (claim) => {
    setAiAnalyzing(true)
    setAiReport(null)
    const report = await analyzeClaimForFraud(claim, claim.profiles, claim.weather_data)
    setAiReport(report)
    setAiAnalyzing(false)
  }

  const filteredClaims = claims.filter(c => 
    c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.profiles?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.weather_event?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div className="flex justify-between w-full">
          <div>
            <h1 className="page-title">Claims Review Dashboard</h1>
            <p className="page-subtitle">Multi-factor parametric claim verification overseen by AI</p>
          </div>
          <div className="flex gap-12 admin-controls">
            <div className="input-group" style={{width: 300}}>
              <Search size={16} className="input-icon" />
              <input 
                type="text" 
                className="form-input text-sm" 
                placeholder="Search workers/cities..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost btn-sm"><Filter size={14} /> Filters</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card admin-table-card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker Profile</th>
                  <th>Region / City</th>
                  <th>Trigger / Event</th>
                  <th>GPS / Tracking</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan="7"><div className="skeleton h-40 w-full rounded" /></td></tr>
                  ))
                ) : filteredClaims.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-40 text-muted">No matching claims found.</td></tr>
                ) : filteredClaims.map(c => {
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.triggered
                  const isManual = c.trigger_type === 'manual'
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="worker-pill">
                          <div className="avatar avatar-sm admin-avatar-sm">{c.profiles?.full_name?.charAt(0)}</div>
                          <div className="worker-details">
                            <div className="text-sm font-bold">{c.profiles?.full_name}</div>
                            <div className="text-xs text-muted">{c.profiles?.platform}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                         <div className="text-sm font-medium">📍 {c.profiles?.city}</div>
                         <div className="text-xs text-muted">Pincode: Verified</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-6">
                           <span className={`icon-badge ${isManual?'amber':'blue'}`}>
                             {isManual ? <MapPin size={10}/> : <Zap size={10}/>}
                           </span>
                           <div className="text-sm">
                             {c.weather_event}
                             {isManual && <span className="ml-8 badge badge-amber" style={{fontSize: '0.6rem'}}>🚨 MANUAL</span>}
                           </div>
                        </div>
                        <div className="text-xs text-muted mt-4">{new Date(c.triggered_at).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <div className="text-xs font-mono">
                          {c.worker_lat?.toFixed(4)}, {c.worker_lng?.toFixed(4)}
                        </div>
                        <div className="text-xs text-green mt-2 font-bold">Zone Match: High</div>
                      </td>
                      <td><div className="text-sm font-bold">₹{c.payout_amount}</div></td>
                      <td>
                         <span className={`badge ${st.color} flex items-center gap-4`}>
                           {st.icon} {st.label}
                         </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-xs"
                          onClick={() => { setActiveClaim(c); runAiAnalysis(c); }}
                        >
                          Review & AI Audit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal Side Panel */}
      {activeClaim && (
        <div className="admin-side-panel animate-in">
          <div className="side-panel-header">
             <h3>Claim Audit: Claim-{activeClaim.id.slice(0, 5)}</h3>
             <button className="btn-close" onClick={() => setActiveClaim(null)}>×</button>
          </div>
          <div className="side-panel-content">
             <div className="audit-section mb-24">
                <label className="text-xs text-muted uppercase tracking-wider mb-8 block font-bold">Worker Identification</label>
                <div className="audit-worker p-12 card border-primary-20">
                   <div className="text-sm font-bold">{activeClaim.profiles?.full_name}</div>
                   <div className="text-xs text-muted">{activeClaim.profiles?.platform} Partner | Verified daily activity</div>
                </div>
             </div>

             <div className="audit-section mb-24">
                <label className="text-xs text-muted uppercase tracking-wider mb-8 block font-bold">Gemini AI Audit Result</label>
                <div className={`ai-report-card p-16 card ${aiReport?.fraud_score > 50 ? 'border-coral' : 'border-green'}`}>
                   <div className="flex justify-between items-center mb-12">
                      <div className="text-xs flex items-center gap-4 text-primary">
                        <Cpu size={14} /> AI Score: 
                        <span className={`font-black ${aiReport?.fraud_score > 50 ? 'text-coral' : 'text-green'}`}>
                          {aiAnalyzing ? '...' : aiReport?.fraud_score}
                        </span>
                      </div>
                      <div className={`badge ${aiReport?.location_audit === 'MISMATCH' ? 'badge-coral' : 'badge-green'} text-xs`}>
                        📍 {aiAnalyzing ? 'Auditing...' : `Location: ${aiReport?.location_audit || 'IDENTIFIED'}`}
                      </div>
                   </div>
                   <p className="text-xs leading-relaxed italic text-muted">
                      {aiAnalyzing ? "Gemini 1.5 Flash is analyzing your city zones..." : aiReport?.reasoning}
                   </p>
                </div>
             </div>

             <div className="audit-section mb-24">
                <label className="text-xs text-muted uppercase tracking-wider mb-8 block font-bold">Decision Oversight</label>
                <div className="flex gap-12 mt-8">
                   <button className="btn btn-green flex-1 btn-sm font-bold" onClick={() => handleReview(activeClaim.id, 'paid', 'AI & Admin Verified: Payout Processed')}>Approve & Pay</button>
                   <button className="btn btn-coral flex-1 btn-sm" onClick={() => handleReview(activeClaim.id, 'rejected', 'Fraudulent GPS Activity / Mismatch')}>Reject Claim</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
