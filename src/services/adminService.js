import { supabase } from './supabaseClient'

/**
 * Admin: Get all profiles (workers)
 */
export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

/**
 * Admin: Get all claims across platform
 */
export const getAllClaims = async () => {
  const { data, error } = await supabase
    .from('claims')
    .select('*, profiles(full_name, city, platform)')
    .order('triggered_at', { ascending: false })
  return { data, error }
}

/**
 * Admin: Review and Update claim status
 */
export const reviewClaim = async (claimId, status, notes, adminId) => {
  // 1. Update the claim status
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .update({ status, notes })
    .eq('id', claimId)
    .select()
    .single()
  
  if (claimError) return { error: claimError }

  // 2. If status is 'paid', update the worker's wallet
  if (status === 'paid' && claim) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, total_payouts')
      .eq('id', claim.worker_id)
      .single()

    const newBalance = Number(profile.wallet_balance || 0) + Number(claim.payout_amount)
    const newTotal = Number(profile.total_payouts || 0) + Number(claim.payout_amount)

    await supabase
      .from('profiles')
      .update({ 
        wallet_balance: newBalance,
        total_payouts: newTotal
      })
      .eq('id', claim.worker_id)
  }

  return { data: claim, error: null }
}

/**
 * Admin: Get Region Statistics
 */
export const getRegionStats = async () => {
  const { data: claims } = await getAllClaims()
  if (!claims) return []
  
  const regions = {}
  claims.forEach(c => {
    const city = c.profiles?.city || 'Unknown'
    if (!regions[city]) {
      regions[city] = { city, totalClaims: 0, totalPaid: 0, highRisk: false }
    }
    regions[city].totalClaims++
    if (c.status === 'paid') {
      regions[city].totalPaid += Number(c.payout_amount)
    }
  })
  
  return Object.values(regions)
}

/**
 * Admin: Flag a worker
 */
export const flagWorker = async (workerId, reason) => {
  // We'll update a 'notes' or 'status' field on the profile
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      // We can use the 'notes' or add a 'risk_score' penalty
      risk_score: 95 // Instantly high risk
    })
    .eq('id', workerId)
  return { data, error }
}
