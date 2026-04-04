import { useEffect, useState } from 'react'
import { getAllClaims, getAllProfiles, getRegionStats } from '../../services/adminService'
import { ShieldAlert, Users, Wallet, Map, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ workers: 0, claims: 0, payouts: 0, regions: 0 })
  const [regionData, setRegionData] = useState([])
  const [flaggedClaims, setFlaggedClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: profs }, { data: claims }, regions] = await Promise.all([
        getAllProfiles(),
        getAllClaims(),
        getRegionStats()
      ])

      const totalPaid = claims?.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.payout_amount), 0) || 0
      
      setStats({
        workers: profs?.length || 0,
        claims: claims?.length || 0,
        payouts: totalPaid,
        regions: regions?.length || 0
      })

      setRegionData(regions)
      setFlaggedClaims(claims?.filter(c => c.status === 'triggered').slice(0, 5) || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="loading-screen">Configuring Admin Oversight...</div>

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-subtitle">Monitoring GigShield network and parametric risk delivery</p>
        </div>
      </div>

      <div className="page-body">
        {/* Admin Stats Grid */}
        <div className="grid-4 mb-24">
          <div className="stat-card admin-stat">
            <div className="stat-icon" style={{background:'rgba(102,126,234,0.15)'}}><Users size={22} style={{color:'var(--primary)'}} /></div>
            <div className="stat-value">{stats.workers}</div>
            <div className="stat-label">Total Verified Workers</div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon" style={{background:'rgba(255,171,0,0.15)'}}><ShieldAlert size={22} style={{color:'var(--accent-amber)'}} /></div>
            <div className="stat-value">{stats.claims}</div>
            <div className="stat-label">Total Claims Filed</div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon" style={{background:'rgba(0,230,118,0.15)'}}><Wallet size={22} style={{color:'var(--accent-green)'}} /></div>
            <div className="stat-value" style={{color:'var(--accent-green)'}}>₹{stats.payouts.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Payouts Distributed</div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon" style={{background:'rgba(240,147,251,0.15)'}}><Map size={22} style={{color:'var(--accent-pink)'}} /></div>
            <div className="stat-value">{stats.regions}</div>
            <div className="stat-label">Active Monitoring Regions</div>
          </div>
        </div>

        <div className="grid-65-35">
          {/* Main Chart: Region Distribution */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">📊 Claims Distribution by Region</h3>
            </div>
            <div className="card-body" style={{height: 350}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="city" tick={{fill: '#999', fontSize: 12}} />
                  <YAxis tick={{fill: '#999', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{background: '#1a1f4d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                    itemStyle={{color: '#fff'}}
                  />
                  <Bar dataKey="totalClaims" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.totalClaims > 2 ? 'var(--accent-amber)' : 'var(--primary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Sidebar: Pending Approvals */}
          <div className="card">
            <div className="card-header">
              <h3 className="section-title">🚨 Pending Approvals</h3>
            </div>
            <div className="card-body" style={{padding: 0}}>
              {flaggedClaims.length === 0 ? (
                <div className="empty-payout p-24 text-center">
                  <div className="text-xl mb-8">✅</div>
                  <div className="text-muted text-sm">All claims cleared</div>
                </div>
              ) : (
                flaggedClaims.map(c => (
                  <div key={c.id} className="admin-pending-item p-16 border-b" style={{background: 'rgba(255,255,255,0.02)'}}>
                    <div className="flex justify-between items-start mb-8">
                      <div className="font-bold text-sm">{c.profiles?.full_name}</div>
                      <div className="text-accent-amber font-bold">₹{c.payout_amount}</div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <div>📍 {c.profiles?.city}</div>
                      <div className="badge badge-amber" style={{fontSize: '0.65rem'}}>Review Required</div>
                    </div>
                  </div>
                ))
              )}
              <div className="p-16">
                <button className="btn btn-ghost btn-full btn-sm">Full Review Dashboard →</button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Fraud Intelligence Banner */}
        <div className="card mt-24" style={{background: 'linear-gradient(135deg, rgba(82,106,234,0.08), rgba(255,82,82,0.08))', border: '1px solid rgba(255,82,82,0.2)'}}>
           <div className="card-body flex items-center gap-24">
             <div className="stat-icon" style={{background: 'rgba(255,82,82,0.2)', width: 60, height: 60}}>
               <AlertTriangle size={32} style={{color: '#ff5252'}} />
             </div>
             <div>
               <h3 className="font-bold text-lg mb-4">Gemini AI: Pattern Abnormalities Detected</h3>
               <p className="text-sm text-muted">
                 Multiple manual claims originating from "Tadepalli" exhibit outlier GPS signatures compared to Swiggy partner zones. 
                 <span className="text-accent-amber ml-8 font-bold">System Recommendation: Higher verification threshold for Zone-7 today.</span>
               </p>
             </div>
             <button className="btn btn-primary btn-sm ml-auto">Initiate Zone Analysis</button>
           </div>
        </div>
      </div>
    </div>
  )
}
