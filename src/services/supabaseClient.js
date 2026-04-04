import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email, password, metadata) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Profile helpers
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, city, platform, gps_lat, gps_lng, is_admin, wallet_balance, total_payouts')
    .eq('id', userId)
    .maybeSingle()
  
  if (error && error.code !== 'PGRST116') {
    console.error("🛡️ Supabase Profile Error:", error.message);
  }
  return { data, error }
}

export const upsertProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()
  return { data, error }
}

// Policy helpers
export const getPolicies = async (workerId) => {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createPolicy = async (policy) => {
  const { data, error } = await supabase
    .from('policies')
    .insert(policy)
    .select()
    .single()
  return { data, error }
}

// Claims helpers
export const getClaims = async (workerId) => {
  const { data, error } = await supabase
    .from('claims')
    .select('*, policies(plan_name)')
    .eq('worker_id', workerId)
    .order('triggered_at', { ascending: false })
  return { data, error }
}

export const createClaim = async (claim) => {
  const { data, error } = await supabase
    .from('claims')
    .insert(claim)
    .select()
    .single()
  return { data, error }
}

export const updateClaimStatus = async (claimId, status, paidAt = null) => {
  const updates = { status }
  if (paidAt) updates.paid_at = paidAt
  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', claimId)
    .select()
    .single()
  return { data, error }
}

// Payments helpers
export const getPayments = async (workerId) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, claims(weather_event, trigger_type)')
    .eq('worker_id', workerId)
    .order('paid_at', { ascending: false })
  return { data, error }
}

export const createPayment = async (payment) => {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  return { data, error }
}

// Weather logs
export const logWeather = async (weatherData) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .insert(weatherData)
    .select()
    .single()
  return { data, error }
}

export const getLatestWeatherLog = async (city) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .select('*')
    .eq('city', city)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  return { data, error }
}
