-- DEVTrails 2026 — GigShield Parametric Micro-Insurance
-- Run this entire file in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (Gig Workers)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT NOT NULL DEFAULT 'Mumbai',
  pincode TEXT,
  delivery_type TEXT CHECK (delivery_type IN ('food', 'grocery', 'ecommerce', 'other')) DEFAULT 'food',
  platform TEXT DEFAULT 'Swiggy',
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  is_tracking_enabled BOOLEAN DEFAULT true,
  risk_score INTEGER DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
  active_policy_id UUID,
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  total_payouts DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POLICIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('Basic', 'Standard', 'Premium')),
  weekly_premium DECIMAL(8, 2) NOT NULL,
  coverage_amount DECIMAL(10, 2) NOT NULL,
  rain_threshold_mm DECIMAL(5, 2) DEFAULT 20.00,
  temp_threshold_c DECIMAL(5, 2) DEFAULT 42.00,
  wind_threshold_kmh DECIMAL(5, 2) DEFAULT 60.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'pending')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CLAIMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trigger_type TEXT CHECK (trigger_type IN ('auto', 'manual')) DEFAULT 'auto',
  weather_event TEXT,
  weather_data JSONB,
  payout_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'triggered' CHECK (status IN ('triggered', 'verified', 'paid', 'rejected')),
  worker_lat DECIMAL(10, 8),
  worker_lng DECIMAL(11, 8),
  fraud_score DECIMAL(5, 2) DEFAULT 0.00,
  notes TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'Wallet', 'Bank Transfer')),
  transaction_id TEXT DEFAULT ('TXN' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 10))),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- WEATHER LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.weather_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  city TEXT NOT NULL,
  temperature DECIMAL(5, 2),
  feels_like DECIMAL(5, 2),
  humidity INTEGER,
  rainfall_mm DECIMAL(7, 2) DEFAULT 0.00,
  wind_speed DECIMAL(6, 2),
  description TEXT,
  icon TEXT,
  alert_level TEXT DEFAULT 'none' CHECK (alert_level IN ('none', 'low', 'medium', 'high', 'extreme')),
  is_disruption BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies: users can view their own policies
CREATE POLICY "Users can view own policies" ON public.policies FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Users can insert own policies" ON public.policies FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Claims: users can view/insert their own claims
CREATE POLICY "Users can view own claims" ON public.claims FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Users can insert own claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Payments: users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Weather logs: everyone can read, only service can insert
CREATE POLICY "Anyone can read weather logs" ON public.weather_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weather logs" ON public.weather_logs FOR INSERT WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update updated_at on profiles
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
