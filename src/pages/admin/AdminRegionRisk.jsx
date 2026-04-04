import { useEffect, useState } from 'react'
import { getRegionStats } from '../../services/adminService'
import { Map, AlertTriangle, CloudRain, Bell, Search, TrendingUp, Info } from 'lucide-react'

export default function AdminRegionRisk() {
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const stats = await getRegionStats()
    setRegions(stats || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredRegions = regions.filter(r => 
    r.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="page-header">
        <div className="flex justify-between w-full">
          <div>
            <h1 className="page-title">Region Risk Monitoring</h1>
            <p className="page-subtitle">Real-time risk assessment and geographic alerting system</p>
          </div>
          <div className="input-group" style={{width: 300}}>
            <Search size={16} className="input-icon" />
            <input 
              type="text" 
              className="form-input text-sm" 
              placeholder="Search by city..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Risk Alerts Banner */}
        <div className="grid-3 mb-24">
          <div className="card risk-alert-card border-coral animate-pulse" style={{background: 'rgba(255,82,82,0.05)'}}>
            <div className="card-body flex gap-12">
              <div className="text-coral"><AlertTriangle size={24} /></div>
              <div>
                <div className="font-black uppercase text-xs tracking-widest text-coral">Extreme Risk</div>
                <div className="text-sm font-bold">Mumbai South - Flooding</div>
                <div className="text-xs text-muted">Red Alert: Monsoon Disruption</div>
              </div>
            </div>
          </div>
          <div className="card risk-alert-card border-amber" style={{background: 'rgba(255,171,0,0.05)'}}>
            <div className="card-body flex gap-12 text-amber">
              <div><CloudRain size={24} /></div>
              <div>
                <div className="font-black uppercase text-xs tracking-widest">High Risk</div>
                <div className="text-sm font-bold">Tadepalli - Heatwave</div>
                <div className="text-xs text-dark-muted">River Embankment Thermal Alert</div>
              </div>
            </div>
          </div>
        </div>

        {/* Region List */}
        <div className="grid-region-risk">
          {loading ? (
             <div className="p-40 card text-center">Analyzing IMD Risk Zones...</div>
          ) : filteredRegions.length === 0 ? (
             <div className="p-40 card text-center text-muted">No regions currently detected.</div>
          ) : filteredRegions.map(r => (
            <div key={r.city} className="region-risk-item card hover-up" style={{marginBottom: 16}}>
               <div className="card-body flex justify-between items-center p-20">
                  <div className="flex gap-24 items-center">
                    <div className="stat-icon" style={{width: 50, height: 50, background: 'rgba(102,126,234,0.1)'}}><Map size={24} /></div>
                    <div>
                      <div className="text-lg font-black text-white">{r.city}</div>
                      <div className="text-xs text-muted flex gap-12">
                        <span>📊 Active Workers: High</span>
                        <span>🛡️ Claims: {r.totalClaims}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-24 items-center">
                    <div className="text-right">
                       <div className="text-xs text-muted uppercase tracking-wider font-bold mb-4">Payout Pressure</div>
                       <div className="text-md font-black text-accent-green">₹{r.totalPaid.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="risk-score-badge bg-primary-20 p-8 rounded text-center" style={{minWidth: 80}}>
                       <div className="text-xs text-dim pb-4">Zone Score</div>
                       <div className="text-xl font-black text-amber">62</div>
                    </div>
                    <button className="btn btn-ghost btn-icon p-8 border-dim-20"><Info size={16}/></button>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Intelligence Insight */}
        <div className="card mt-40 border-dim-20">
          <div className="card-body flex items-center gap-16">
             <div className="stat-icon" style={{background: 'rgba(255,255,255,0.05)'}}><TrendingUp size={24} /></div>
             <div className="flex-1">
                <h4 className="font-bold text-sm">System Alert Level: Elevated (Yellow)</h4>
                <p className="text-xs text-muted">A significant uptick in manual claims has been observed in Tadepalli zone. Manual verification required for all ₹500+ payouts.</p>
             </div>
             <button className="btn btn-primary btn-sm flex items-center gap-6"><Bell size={14} /> Send Broadcast Alert</button>
          </div>
        </div>
      </div>
    </div>
  )
}
