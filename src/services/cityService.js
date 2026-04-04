/**
 * Fetches city suggestions using the public OpenWeather Geocoding API.
 * This is a highly reliable source for global city names and their countries.
 */

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export async function getCitySuggestions(query) {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Geocoding API failed');
    
    const data = await response.json();
    
    // Transform to objects with labels and coordinates
    return data.map(city => {
      const parts = [city.name];
      if (city.state) parts.push(city.state);
      if (city.country) parts.push(city.country);
      return {
        label: parts.join(', '),
        lat: city.lat,
        lon: city.lon
      };
    });
  } catch (error) {
    console.error("City Suggestions Error:", error);
    // Simple static fallback of major Indian cities if API fails
    const staticCities = [
      { label: 'Mumbai, Maharashtra, IN', lat: 19.076, lon: 72.877 },
      { label: 'Delhi, Delhi, IN', lat: 28.614, lon: 77.209 },
      { label: 'Bangalore, Karnataka, IN', lat: 12.972, lon: 77.595 },
      { label: 'Hyderabad, Telangana, IN', lat: 17.385, lon: 78.487 },
      { label: 'Ahmedabad, Gujarat, IN', lat: 23.023, lon: 72.571 }
    ];
    return staticCities.filter(city => city.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }
}
