import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPayments, getClaims } from '../services/supabaseClient'
import { Wallet, TrendingUp, CreditCard, ArrowDownLeft, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Payments() {
  const { user, profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: pays }, { data: clms }] = await Promise.all([
      getPayments(user.id),
      getClaims(user.id),
    ])
    setPayments(pays || [])
    setClaims(clms || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const totalReceived = payments.reduce((s,p) => s + Number(p.amount||0), 0)
  const completedPayments = payments.filter(p => p.status === 'completed')

  // Build chart data (last 7 days)
  const chartData = buildChartData(payments)

  const PaymentRow = ({ pay }) => {
    const claim = claims.find(c => c.id === pay.claim_id)
    return (
      <div className="payment-item">
        <div className="payment-icon">
          {claim?.trigger_type === 'auto' ? '⚡' : '📝'}
        </div>
        <div className="payment-info">
          <div className="payment-title">
            {claim?.weather_event || 'Insurance Payout'}
          </div>
          <div className="payment-meta">
            <span>{new Date(pay.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
            <span>·</span>
            <span>{pay.payment_method}</span>
            <span>·</span>
            <span className={`badge ${pay.status==='completed'?'badge-green':'badge-amber'}`} style={{padding:'2px 8px',fontSize:'0.65rem'}}>{pay.status}</span>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="payment-amount">+₹{Number(pay.amount).toLocaleString('en-IN')}</div>
          <div className="payment-txn">{pay.transaction_id}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment History</h1>
          <p className="page-subtitle">All insurance payouts credited to your wallet</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}><RefreshCw size={14}/> Refresh</button>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stats-grid mb-24">
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(0,230,118,0.1)'}}><Wallet size={22} style={{color:'var(--accent-green)'}}/></div>
            <div className="stat-value" style={{color:'var(--accent-green)'}}>₹{totalReceived.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Received</div>
            <div className="stat-change stat-up">↑ All payouts</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(102,126,234,0.15)'}}><ArrowDownLeft size={22} style={{color:'var(--primary)'}}/></div>
            <div className="stat-value">{completedPayments.length}</div>
            <div className="stat-label">Completed Payouts</div>
            <div className="stat-change stat-up">100% success rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(255,171,0,0.15)'}}><TrendingUp size={22} style={{color:'var(--accent-amber)'}}/></div>
            <div className="stat-value">
              {completedPayments.length > 0 ? `₹${Math.round(totalReceived/completedPayments.length).toLocaleString('en-IN')}` : '₹0'}
            </div>
            <div className="stat-label">Avg. Payout</div>
            <div className="stat-change" style={{color:'var(--text-muted)'}}>Per claim</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(240,147,251,0.15)'}}><CreditCard size={22} style={{color:'var(--accent-pink)'}}/></div>
            <div className="stat-value">UPI</div>
            <div className="stat-label">Payment Method</div>
            <div className="stat-change" style={{color:'var(--accent-green)'}}>Instant transfer</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="card mb-24 animate-in">
            <div className="card-body">
              <div className="section-header">
                <span className="section-title">📈 Payout Trend (Last 7 Days)</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'rgba(240,244,255,0.5)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11,fill:'rgba(240,244,255,0.5)'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                  <Tooltip
                    contentStyle={{background:'rgba(13,16,51,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#f0f4ff'}}
                    formatter={(val)=>[`₹${val}`, 'Payout']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#00e676" strokeWidth={2} fill="url(#payGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Payment List */}
        <div className="card animate-in">
          <div className="card-header" style={{paddingBottom:'16px',borderBottom:'1px solid var(--glass-border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span className="section-title">💳 All Transactions</span>
              <div style={{display:'flex',gap:'8px'}}>
                {['all','upi','manual'].map(tab=>(
                  <button
                    key={tab}
                    onClick={()=>setActiveTab(tab)}
                    className={`btn btn-sm ${activeTab===tab?'btn-primary':'btn-ghost'}`}
                    style={{textTransform:'capitalize'}}
                  >
                    {tab === 'all' ? 'All' : tab === 'upi' ? '⚡ Auto' : '📝 Manual'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{padding:'24px'}}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{display:'flex',gap:'16px',marginBottom:'16px',alignItems:'center'}}>
                  <div className="skeleton" style={{width:44,height:44,borderRadius:'var(--radius-md)',flexShrink:0}}/>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                    <div className="skeleton" style={{height:15,width:'55%'}}/>
                    <div className="skeleton" style={{height:11,width:'35%'}}/>
                  </div>
                  <div className="skeleton" style={{height:20,width:80}}/>
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div className="empty-title">No payouts yet</div>
              <p className="empty-text">Payouts will appear here once claims are processed. Stay protected with an active policy!</p>
            </div>
          ) : (
            filterPayments(payments, claims, activeTab).map(pay => (
              <PaymentRow key={pay.id} pay={pay} />
            ))
          )}
        </div>

        {/* Simulated UPI Wallet */}
        <div className="card animate-in" style={{marginTop:'24px',background:'linear-gradient(135deg,rgba(0,230,118,0.08),rgba(0,188,212,0.06))'}}>
          <div className="card-body">
            <div style={{display:'flex',gap:'20px',alignItems:'center',flexWrap:'wrap'}}>
              <div style={{fontSize:'3rem'}}>💳</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Outfit',fontSize:'1.3rem',fontWeight:800,marginBottom:'4px'}}>GigShield UPI Wallet</div>
                <div style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>All payouts are directly credited via UPI to your registered mobile number on file.</div>
              </div>
              <div style={{textAlign:'center',padding:'20px 32px',background:'var(--bg-card)',borderRadius:'var(--radius-lg)'}}>
                <div style={{fontFamily:'Outfit',fontSize:'2rem',fontWeight:800,color:'var(--accent-green)'}}>₹{totalReceived.toLocaleString('en-IN')}</div>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:'4px'}}>Total Received</div>
              </div>
            </div>

            <div style={{marginTop:'20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
              {[
                { icon:'⚡', label:'Instant UPI', desc:'Paid within 2 hours of claim' },
                { icon:'🔒', label:'Zero Deduction', desc:'Full amount, no commissions' },
                { icon:'📱', label:'Mobile Linked', desc:`Sent to ${profile?.phone ? '••••'+profile.phone.slice(-4) : 'your number'}` },
              ].map(f=>(
                <div key={f.label} style={{padding:'14px',background:'var(--bg-card)',borderRadius:'var(--radius-md)',textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',marginBottom:'8px'}}>{f.icon}</div>
                  <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'4px'}}>{f.label}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers
function buildChartData(payments) {
  const days = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})
    days[key] = 0
  }
  payments.forEach(p => {
    const key = new Date(p.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
    if (key in days) days[key] += Number(p.amount||0)
  })
  return Object.entries(days).map(([date,amount])=>({date,amount}))
}

function filterPayments(payments, claims, tab) {
  if (tab === 'all') return payments
  if (tab === 'upi') return payments.filter(p => {
    const claim = claims.find(c=>c.id===p.claim_id)
    return claim?.trigger_type === 'auto'
  })
  if (tab === 'manual') return payments.filter(p => {
    const claim = claims.find(c=>c.id===p.claim_id)
    return claim?.trigger_type === 'manual'
  })
  return payments
}
