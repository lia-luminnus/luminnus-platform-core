
/**
 * LIA Configuration Service
 * Responsible for securely retrieving the API Key.
 *
 * STRATEGY:
 * 1. Try to fetch from the Backend API (http://localhost:5000/api/session).
 * 2. If running locally or backend fails, fallback to process.env.API_KEY.
 */

// UNIFIED ARCHITECTURE: Frontend and Backend on same port (3000)
// Use relative URLs for all API calls
const BACKEND_URL = '';



export const getApiKey = async (): Promise<string> => {
  // 1. Attempt Backend Retrieval (Production/Integration Mode)
  try {
    const response = await fetch(`${BACKEND_URL}/api/session`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      // Contract: Backend must return { "apiKey": "..." }
      if (data.apiKey) {
        console.log('[ConfigService] API Key retrieved from backend');
        return data.apiKey;
      }
    }
  } catch (error) {
    // Backend not available (likely running in standalone dev mode)
    console.warn("[ConfigService] Backend not available, trying local env");
  }

  // 2. Fallback to Local Environment (Dev Mode / AI Studio)
  if (process.env.API_KEY) {
    console.log('[ConfigService] Using API Key from local environment');
    return process.env.API_KEY;
  }

  throw new Error("CRITICAL: API Key could not be retrieved from Backend (/api/session) or Local Environment.");
};
