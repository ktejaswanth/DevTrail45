import { Globe, Mail, Phone, ExternalLink, Shield, Users, Award, ArrowLeft } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function About() {
  const { user } = useAuth()
  const team = [
    {
      name: 'K RUTHWIK',
      role: 'Team Member',
      linkedin: 'https://www.linkedin.com/in/ramya-jnana-naga-prasad-rutvik-kollepara-02110a301/',
      highlight: false
    },
    {
      name: 'KODALI PAVANI',
      role: 'Team Member',
      linkedin: 'https://www.linkedin.com/in/kodalipavani22/',
      highlight: false
    },
    {
      name: 'VIJAY KUMAR',
      role: 'Team Member',
      linkedin: 'https://www.linkedin.com/in/gopu-vijay-kumar-b65482367/',
      highlight: false
    }
  ]

  return (
    <div className="animate-in" style={{maxWidth: '1200px', margin: '0 auto', padding: '40px 24px'}}>
      <div style={{marginBottom: '24px'}}>
        <Link to="/" className="btn btn-ghost btn-sm" style={{borderColor: 'transparent', padding: 0}}>
          <ArrowLeft size={18} style={{marginRight: '8px'}} /> Return to {user ? 'Dashboard' : 'Home'}
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">About the Team</h1>
          <p className="page-subtitle">The innovators behind GigShield Parametric Insurance</p>
        </div>
      </div>

      <div className="page-body">
        {/* Project Mission Card */}
        <div className="card mb-32" style={{background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))', border: '1px solid var(--primary-light)'}}>
          <div className="card-body" style={{display: 'flex', alignItems: 'center', gap: '32px', padding: '40px'}}>
            <div style={{fontSize: '3.5rem'}}>🛡️</div>
            <div>
              <h2 style={{fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px'}}>Our Mission</h2>
              <p className="text-muted" style={{maxWidth: '600px', lineHeight: 1.6}}>
                GigShield is built to provide a safety net for India's gig economy. Using AI and real-time weather data, 
                we ensure delivery partners are compensated instantly when extreme weather disrupts their ability to work.
              </p>
            </div>
          </div>
        </div>

        {/* Highlighted Lead Member */}
        <h3 className="section-title mb-16" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Award size={20} color="var(--accent-amber)" /> Lead Developer
        </h3>
        <div className="card mb-32 card-glow" style={{border: '2px solid var(--accent-amber)', background: 'rgba(255, 171, 0, 0.03)'}}>
          <div className="card-body" style={{display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center'}}>
            <div className="user-avatar" style={{width: '100px', height: '100px', fontSize: '2.5rem', background: 'var(--grad-primary)', color: 'white', fontWeight: 800, boxShadow: '0 10px 20px rgba(0,0,0,0.2)'}}>
              KT
            </div>
            <div style={{flex: 1, minWidth: '300px'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '4px'}}>
                KONDAVETI TEJASWANTH
              </h2>
              <p style={{color: 'var(--accent-amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.85rem', marginBottom: '16px'}}>
                System Architect & Lead Developer
              </p>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                  <Phone size={16} color="var(--primary)" /> <span>+91 8688088449</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                  <Mail size={16} color="var(--primary)" /> <span>ktejaswanth05@gmail.com</span>
                </div>
              </div>

              <div style={{display: 'flex', gap: '12px'}}>
                <a href="https://github.com/ktejaswanth" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{borderColor: 'var(--glass-border)'}}>
                  <Globe size={16} /> GitHub
                </a>
                <a href="https://www.linkedin.com/in/ktejaswanth" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <ExternalLink size={16} /> LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Other Team Members */}
        <h3 className="section-title mb-16" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Users size={20} /> Project Collaborators
        </h3>
        <div className="grid-3">
          {team.map(member => (
            <div key={member.name} className="card">
              <div className="card-body" style={{textAlign: 'center', padding: '32px 24px'}}>
                <div className="user-avatar" style={{margin: '0 auto 20px', width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', fontSize: '1.2rem', fontWeight: 700}}>
                  {member.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <h4 style={{fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px'}}>{member.name}</h4>
                <p className="text-muted text-xs mb-20">{member.role}</p>
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-full btn-sm">
                  <ExternalLink size={14} /> Profile
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Tech Stack Footer */}
        <div style={{marginTop: '48px', padding: '24px', textAlign: 'center', borderTop: '1px solid var(--glass-border)'}}>
          <p className="text-sm text-dim mb-16">Built with Passion for DEVTrails 2026</p>
          <div style={{display: 'flex', justifyContent: 'center', gap: '24px', opacity: 0.6}}>
            <span style={{fontSize: '0.8rem', fontWeight: 600}}>REACT</span>
            <span style={{fontSize: '0.8rem', fontWeight: 600}}>SUPABASE</span>
            <span style={{fontSize: '0.8rem', fontWeight: 600}}>OPENWEATHER API</span>
            <span style={{fontSize: '0.8rem', fontWeight: 600}}>LUCIDE ICONS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
