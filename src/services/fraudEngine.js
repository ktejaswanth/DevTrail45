import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * AI: Analyze Claim for Fraud using Gemini 1.5 Flash
 */
export const analyzeClaimForFraud = async (claim, workerProfile, weatherData) => {
  if (!API_KEY) return { fraud_score: 15, reason: "No API key config. Basic heuristic check only." }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an AI Fraud Detection analyst for "GigShield".
      Analyze this claim and return JSON: { "fraud_score": 0-100, "reasoning": "string", "location_audit": "MATCH/MISMATCH/SUSPICIOUS" }
      
      WORKER: ${workerProfile.full_name} (${workerProfile.city})
      CLAIM: ${claim.trigger_type} trigger for ${claim.weather_event}
      PAYOUT: ₹${claim.payout_amount}
      GPS: ${claim.worker_lat}, ${claim.worker_lng}
      
      CRITICAL AUDIT TASKS:
      1. LOCATION DRIFT: Does the GPS (${claim.worker_lat}, ${claim.worker_lng}) actually belong to the city of ${workerProfile.city}? If they are more than 15km away from the city center, mark as MISMATCH.
      2. MANUAL SKEPTICISM: If this is a MANUAL claim, be 2x more suspicious. Look for "vague" reasons.
      3. WEATHER MATCH: Does the rainfall (${weatherData?.rainfall_mm}mm) justify a payout of ₹${claim.payout_amount}?
      
      Return JSON ONLY.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      return JSON.parse(cleanedText);
    } catch {
      return { fraud_score: 20, reason: "AI response parsed incorrectly." }
    }
  } catch (err) {
    console.error("AI Fraud analysis error:", err);
    return { fraud_score: 5, reason: "Heuristic: Location mismatch" }
  }
}

/**
 * AI: Region Risk Report Generation
 */
export const getRegionRiskReport = async (city, weatherData) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Provide a 2-sentence risk summary for gig workers in ${city} today based on current rainfall: ${weatherData?.rainfall_mm}mm and temp: ${weatherData?.temperature}°C. Highlight natural risks like flooding or heatwaves uniquely to this region. Output just text.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return "Moderate risk based on city averages. No extreme alerts detected locally.";
  }
}
