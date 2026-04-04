// =============================================
// AI-Powered Risk Engine
// Calculates risk scores and premium amounts
// =============================================

// City-level base risk scores (historical data simulation + IMD classification)
const CITY_BASE_RISK = {
  'Mumbai': 72,    // High flood risk (Dharavi, coastal)
  'Delhi': 65,     // High pollution + heat
  'Bangalore': 48, // Moderate
  'Hyderabad': 55, // Heat waves + flooding
  'Chennai': 68,   // Cyclone + flood
  'Kolkata': 70,   // Cyclone + monsoon flood
  'Pune': 45,      
  'Ahmedabad': 58, 
  'Jaipur': 52,    
  'Surat': 60,     
  'Vijayawada': 62, // Heat + River Krishna flood risk
  'Vizag': 65,     // Cyclone hub
  'Guntur': 58,    // High heat
  'Amaravati': 55, // Moderate/Developing
  'Tadepalli': 60, // Flood risk due to proximity to Krishna river embankment
}

// Delivery type risk multiplier
const DELIVERY_TYPE_RISK = {
  'food': 1.2,       
  'grocery': 1.15,   
  'ecommerce': 1.0,  
  'other': 1.1,
}

// Platform risk modifier (based on working patterns)
const PLATFORM_RISK = {
  'Swiggy': 1.1,
  'Zomato': 1.1,
  'Zepto': 1.15,   
  'Blinkit': 1.12,
  'Amazon': 1.0,
  'Dunzo': 1.05,
  'Other': 1.0,
}

// Base weekly premium by plan (INR)
const BASE_PREMIUMS = {
  'Basic':    30,
  'Standard': 40,
  'Premium':  50,
}

// Coverage amounts by plan (INR)
const COVERAGE_AMOUNTS = {
  'Basic':    300,
  'Standard': 500,
  'Premium':  800,
}

/**
 * Calculate risk score for a worker (0–100)
 */
export const calculateRiskScore = ({ city, delivery_type, platform, weather }) => {
  // If city is unknown, check substring match (e.g., 'Tadepalli, Guntur' -> 60)
  let baseScore = 50;
  Object.keys(CITY_BASE_RISK).forEach(cityName => {
    if (city?.toLowerCase().includes(cityName.toLowerCase())) {
        baseScore = CITY_BASE_RISK[cityName];
    }
  });
  
  let score = baseScore;

  // Apply delivery type modifier
  const deliveryMod = DELIVERY_TYPE_RISK[delivery_type] || 1.0
  score = score * deliveryMod

  // Apply platform modifier
  const platformMod = PLATFORM_RISK[platform] || 1.0
  score = score * platformMod

  // Boost score if live weather is bad
  if (weather) {
    if (weather.rainfall_mm > 20) score += 18
    else if (weather.rainfall_mm > 5) score += 10
    if (weather.temperature > 42) score += 14
    else if (weather.temperature > 38) score += 8
    if (weather.wind_speed > 60) score += 12
    if (weather.alert_level === 'extreme') score += 25
    else if (weather.alert_level === 'high') score += 12
  }

  return Math.min(100, Math.round(score))
}

/**
 * Get risk label and color from score
 */
export const getRiskLabel = (score) => {
  if (score >= 80) return { label: 'Extreme Risk', color: '#ff4444', bg: 'rgba(255,68,68,0.15)' }
  if (score >= 65) return { label: 'High Risk', color: '#ff8c00', bg: 'rgba(255,140,0,0.15)' }
  if (score >= 45) return { label: 'Moderate Risk', color: '#ffd700', bg: 'rgba(255,215,0,0.15)' }
  return { label: 'Low Risk', color: '#00e676', bg: 'rgba(0,230,118,0.15)' }
}

/**
 * Calculate weekly premium (INR) based on risk score
 */
export const calculatePremium = (plan, riskScore) => {
  const base = BASE_PREMIUMS[plan] || 40
  const riskMultiplier = 1 + ((riskScore - 50) / 100) // -0.5 to +0.5 modifier
  const premium = base * riskMultiplier
  return Math.max(base * 0.7, Math.min(base * 1.5, Math.round(premium)))
}

/**
 * Get coverage amount by plan
 */
export const getCoverageAmount = (plan) => COVERAGE_AMOUNTS[plan] || 500

/**
 * Calculate payout for a disruption event
 */
export const calculatePayout = (policy, weatherData) => {
  const base = policy.coverage_amount || getCoverageAmount(policy.plan_name)
  let multiplier = 1.0

  if (weatherData.alert_level === 'extreme') multiplier = 1.0
  else if (weatherData.alert_level === 'high') multiplier = 0.85
  else multiplier = 0.5

  // Rain severity multiplier
  if (weatherData.rainfall_mm > 50) multiplier = Math.max(multiplier, 1.0)
  else if (weatherData.rainfall_mm > 20) multiplier = Math.max(multiplier, 0.75)

  // Heat severity multiplier
  if (weatherData.temperature > 45) multiplier = Math.max(multiplier, 0.9)

  return Math.round(base * multiplier)
}

/**
 * Fraud detection: validate GPS is within expected zone
 */
export const detectFrauds = (workerLat, workerLng, cityName) => {
  const CITY_BOUNDS = {
    'Mumbai': { latMin: 18.89, latMax: 19.27, lngMin: 72.77, lngMax: 73.01 },
    'Delhi': { latMin: 28.40, latMax: 28.88, lngMin: 76.84, lngMax: 77.35 },
    'Bangalore': { latMin: 12.83, latMax: 13.14, lngMin: 77.46, lngMax: 77.75 },
    'Hyderabad': { latMin: 17.20, latMax: 17.60, lngMin: 78.30, lngMax: 78.60 },
    'Chennai': { latMin: 12.90, latMax: 13.23, lngMin: 80.18, lngMax: 80.33 },
    'Kolkata': { latMin: 22.44, latMax: 22.68, lngMin: 88.28, lngMax: 88.43 },
  }

  const bounds = CITY_BOUNDS[cityName]
  if (!bounds || !workerLat || !workerLng) return { fraud_score: 0, is_valid: true }

  const inBounds = (
    workerLat >= bounds.latMin && workerLat <= bounds.latMax &&
    workerLng >= bounds.lngMin && workerLng <= bounds.lngMax
  )

  return {
    fraud_score: inBounds ? 0 : 85,
    is_valid: inBounds,
    reason: inBounds ? 'Location verified' : 'GPS outside expected zone'
  }
}

/**
 * Get insurance plans with AI-calculated premiums
 */
export const getInsurancePlans = (riskScore) => [
  {
    name: 'Basic',
    emoji: '🛡️',
    weekly_premium: calculatePremium('Basic', riskScore),
    coverage_amount: COVERAGE_AMOUNTS['Basic'],
    features: [
      'Rain coverage (>20mm)',
      'Up to ₹300 per event',
      'Auto claim trigger',
      '1 claim per week',
    ],
    color: '#667eea',
    recommended: false,
  },
  {
    name: 'Standard',
    emoji: '⚡',
    weekly_premium: calculatePremium('Standard', riskScore),
    coverage_amount: COVERAGE_AMOUNTS['Standard'],
    features: [
      'Rain + Heatwave coverage',
      'Up to ₹500 per event',
      'Auto + Manual claims',
      '2 claims per week',
      'Flood protection',
    ],
    color: '#764ba2',
    recommended: true,
  },
  {
    name: 'Premium',
    emoji: '👑',
    weekly_premium: calculatePremium('Premium', riskScore),
    coverage_amount: COVERAGE_AMOUNTS['Premium'],
    features: [
      'All weather events',
      'Up to ₹800 per event',
      'Priority payout (2 hrs)',
      'Unlimited claims',
      'AQI + Pollution cover',
      'Accident rider included',
    ],
    color: '#f093fb',
    recommended: false,
  },
]
