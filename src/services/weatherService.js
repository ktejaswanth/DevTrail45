const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

// City coordinate mapping for Indian gig-economy cities
export const CITY_COORDS = {
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Delhi': { lat: 28.6139, lon: 77.2090 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 },
  'Chennai': { lat: 13.0827, lon: 80.2707 },
  'Kolkata': { lat: 22.5726, lon: 88.3639 },
  'Pune': { lat: 18.5204, lon: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 },
  'Surat': { lat: 21.1702, lon: 72.8311 },
}

export const fetchWeatherByCity = async (city) => {
  const coords = CITY_COORDS[city];
  try {
    const url = coords 
      ? `${BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}&units=metric`
      : `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
      
    const response = await fetch(url)
    if (!response.ok) throw new Error('Weather API failed')
    const data = await response.json()
    return parseWeatherData(data, city)
  } catch (err) {
    console.error('Weather fetch error:', err)
    return getMockWeather(city)
  }
}

export const fetchWeatherByCoords = async (lat, lon, city = 'Unknown') => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    )
    if (!response.ok) throw new Error('Weather API failed')
    const data = await response.json()
    return parseWeatherData(data, city)
  } catch (err) {
    console.error('Weather fetch error:', err)
    return getMockWeather(city)
  }
}

const parseWeatherData = (data, city) => {
  const rainfall = data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0
  const windKmh = (data.wind?.speed || 0) * 3.6
  const temp = data.main?.temp || 28
  const humidity = data.main?.humidity || 60
  const description = data.weather?.[0]?.description || 'clear sky'
  const icon = data.weather?.[0]?.icon || '01d'

  const alertLevel = getAlertLevel(rainfall, temp, windKmh)
  const isDisruption = alertLevel === 'high' || alertLevel === 'extreme'
  const disruptionType = getDisruptionType(rainfall, temp, windKmh)

  return {
    city: data.name || city,
    temperature: Math.round(temp * 10) / 10,
    feels_like: Math.round((data.main?.feels_like || temp) * 10) / 10,
    humidity,
    rainfall_mm: Math.round(rainfall * 100) / 100,
    wind_speed: Math.round(windKmh * 10) / 10,
    description,
    icon,
    alert_level: alertLevel,
    is_disruption: isDisruption,
    disruption_type: disruptionType,
    raw_data: data,
    fetched_at: new Date().toISOString()
  }
}

const getAlertLevel = (rainfall, temp, windKmh) => {
  if (rainfall > 50 || temp > 45 || windKmh > 80) return 'extreme'
  if (rainfall > 20 || temp > 42 || windKmh > 60) return 'high'
  if (rainfall > 10 || temp > 38 || windKmh > 40) return 'medium'
  if (rainfall > 2 || temp > 35 || windKmh > 20) return 'low'
  return 'none'
}

const getDisruptionType = (rainfall, temp, windKmh) => {
  if (rainfall > 20) return 'Heavy Rain / Flood'
  if (temp > 42) return 'Extreme Heatwave'
  if (windKmh > 60) return 'Severe Windstorm'
  if (rainfall > 5) return 'Moderate Rain'
  if (temp > 38) return 'High Heat'
  return null
}

// Fallback mock data when API fails
export const getMockWeather = (city) => {
  const scenarios = [
    { rainfall_mm: 25, temperature: 28, wind_speed: 45, description: 'heavy rain', icon: '10d', alert_level: 'high', is_disruption: true, disruption_type: 'Heavy Rain / Flood' },
    { rainfall_mm: 0, temperature: 43, wind_speed: 15, description: 'clear sky', icon: '01d', alert_level: 'high', is_disruption: true, disruption_type: 'Extreme Heatwave' },
    { rainfall_mm: 2, temperature: 31, wind_speed: 18, description: 'partly cloudy', icon: '02d', alert_level: 'low', is_disruption: false, disruption_type: null },
  ]
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  return {
    city,
    humidity: 75,
    feels_like: scenario.temperature + 3,
    fetched_at: new Date().toISOString(),
    raw_data: {},
    ...scenario
  }
}
