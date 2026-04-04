import { useAuth } from '../context/AuthContext'
import { AlertCircle, CheckCircle, XCircle, Code } from 'lucide-react'

export default function Debug() {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="loading-screen">Reading login session...</div>

  const isAdmin = user?.email?.includes('admin') || profile?.is_admin

  return (
    <div className="p-40 flex flex-col gap-24 max-w-xl mx-auto">
      <div className="card border-primary p-24">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-12">
           <AlertCircle className="text-primary" /> Session Debugger
        </h1>
        <p className="text-muted text-sm">Use this to verify if the admin portal will let you in.</p>
      </div>

      <div className={`card p-20 flex items-center justify-between ${isAdmin ? 'border-green bg-green-5' : 'border-coral bg-coral-5'}`}>
         <div className="font-bold">Admin Status:</div>
         <div className="flex items-center gap-8 font-black uppercase tracking-widest text-lg">
           {isAdmin ? <><CheckCircle className="text-green" /> ACCESS GRANTED</> : <><XCircle className="text-coral" /> ACCESS DENIED</>}
         </div>
      </div>

      <div className="card p-24">
         <div className="text-xs text-muted uppercase font-bold mb-12 flex items-center gap-8"><Code size={14} /> Profile Data (From Database)</div>
         <pre className="bg-dark p-16 rounded overflow-auto text-xs text-green border border-dim-20" style={{maxHeight: 200}}>
           {JSON.stringify(profile, null, 2)}
         </pre>
         {!profile?.is_admin && (
           <div className="mt-16 p-12 bg-amber-10 border border-amber rounded text-xs text-amber-900 font-medium">
             ⚠️ NOTICE: "is_admin" is not set to true in your database record. Go to Supabase Table Editor and check it!
           </div>
         )}
      </div>

      <div className="card p-24">
         <div className="text-xs text-muted uppercase font-bold mb-12 flex items-center gap-8"><Code size={14} /> User Data (From Auth Session)</div>
         <pre className="bg-dark p-16 rounded overflow-auto text-xs text-blue border border-dim-20" style={{maxHeight: 200}}>
           {JSON.stringify(user, null, 2)}
         </pre>
      </div>
      
      <button className="btn btn-primary btn-full shadow-lg" onClick={() => window.location.href = '/'}>Return Home</button>
    </div>
  )
}
