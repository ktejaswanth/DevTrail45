import { useEffect, useState } from 'react'
import { getAllProfiles, flagWorker } from '../../services/adminService'
import { UserCheck, ShieldOff, Search, Clock, Activity, AlertCircle } from 'lucide-react'

export default function AdminWorkers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const { data } = await getAllProfiles()
    setWorkers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleFlag = async (workerId) => {
    if (confirm('Flag this worker for suspicious activity? This will review all their recent claims.')) {
      await flagWorker(workerId, 'Suspicious GPS pattern detected')
      fetchData()
    }
  }

  const filteredWorkers = workers.filter(w => 
    w.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="page-header">
        <div className="flex justify-between w-full">
          <div>
            <h1 className="page-title">Worker Verification</h1>
            <p className="page-subtitle">Monitoring daily activity and platform occupancy for ${workers.length} workers</p>
          </div>
          <div className="input-group" style={{width: 300}}>
            <Search size={16} className="input-icon" />
            <input 
              type="text" 
              className="form-input text-sm" 
              placeholder="Search by name, city or platform..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card admin-table-card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Contact / City</th>
                  <th>Platform & Type</th>
                  <th>Risk Score</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center p-40">Loading Workers...</td></tr>
                ) : filteredWorkers.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div className="worker-pill">
                        <div className="avatar avatar-sm" style={{background: 'var(--primary-light)'}}>{w.full_name?.charAt(0)}</div>
                        <div className="worker-details">
                          <div className="text-sm font-bold">{w.full_name}</div>
                          <div className="text-xs text-muted">ID: {w.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{w.phone || 'No Phone'}</div>
                      <div className="text-xs text-muted">📍 {w.city}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{w.platform}</div>
                      <div className="text-xs text-muted capitalize">{w.delivery_type}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-8">
                        <div className="risk-bar" style={{width: 60, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden'}}>
                          <div style={{height: '100%', width: `${w.risk_score}%`, background: w.risk_score > 70 ? 'var(--accent-coral)' : (w.risk_score > 40 ? 'var(--accent-amber)' : 'var(--accent-green)')}} />
                        </div>
                        <span className="text-xs font-bold">{w.risk_score}</span>
                      </div>
                    </td>
                    <td>
                       <div className="flex items-center gap-4 text-xs text-muted">
                        <Clock size={12} /> {w.updated_at ? new Date(w.updated_at).toLocaleTimeString() : 'N/A'}
                       </div>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-ghost btn-xs" title="View Profile"><Activity size={14} /></button>
                        <button 
                          className="btn btn-coral btn-xs" 
                          onClick={() => handleFlag(w.id)}
                          title="Flag for Fraud"
                        >
                          <ShieldOff size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
