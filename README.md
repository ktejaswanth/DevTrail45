# 🛡️ GigShield — DEVTrails 2026
### AI-Powered Parametric Micro-Insurance for India's Gig Economy

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```
Visit → **http://localhost:5173**

---

## ⚙️ Setup Required: Supabase Database

**You MUST run the SQL schema before logging in:**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open project → **SQL Editor**
3. Copy & paste **all contents** of `supabase-schema.sql`
4. Click **Run** ✅

---

## 🔑 Environment Variables (.env)

Already configured with your keys:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_OPENWEATHER_API_KEY
VITE_GEMINI_API_KEY
```

---

## 📁 Project Structure

```
src/
├── context/
│   └── AuthContext.jsx       # Global auth & profile state
├── services/
│   ├── supabaseClient.js     # Database + auth helpers
│   ├── weatherService.js     # OpenWeather API integration
│   └── riskEngine.js         # AI risk scoring & premium calc
├── components/
│   └── Layout.jsx            # Sidebar navigation
├── pages/
│   ├── Login.jsx             # Login / Signup
│   ├── Register.jsx          # 3-step registration
│   ├── Dashboard.jsx         # Main dashboard
│   ├── Policy.jsx            # Insurance plans
│   ├── Claims.jsx            # Auto + manual claims
│   └── Payments.jsx         # Payment history
└── index.css                 # Full design system
```

---

## 🧠 How It Works

| Step | What Happens |
|:-----|:------------|
| 1. Register | Worker enters city, delivery type, platform |
| 2. Risk Score | AI calculates risk (0–100) from weather + city + job type |
| 3. Premium | Based on risk score: Basic ₹30/wk, Standard ₹40/wk, Premium ₹50/wk |
| 4. Auto-Trigger | Rain >20mm or Temp >42°C → claim auto-created |
| 5. GPS Check | AI validates worker is in the disruption zone |
| 6. Payout | ₹300–₹800 credited via UPI within 2 hours |

---

## 🏆 Hackathon-Winning Features

- ✅ **Parametric Insurance** — zero paperwork, auto-triggered
- ✅ **Live OpenWeather API** — real-time disruption detection
- ✅ **AI Risk Engine** — city + job + weather = risk score
- ✅ **Fraud Detection** — GPS bounds validation
- ✅ **Supabase RLS** — row-level security for all data
- ✅ **Instant Payout Simulation** — UPI within seconds in demo
- ✅ **Premium Dark UI** — glassmorphism, animations, responsive
