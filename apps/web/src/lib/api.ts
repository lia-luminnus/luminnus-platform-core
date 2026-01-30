/**
 * API Configuration
 * Provides the base URL for backend services depending on the environment.
 */

// In production (Render), we use VITE_API_URL or VITE_BACKEND_URL from env
// In development, we use relative path because of Vite proxy
const isProduction = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;

export const API_BASE_URL = isProduction && envApiUrl 
  ? envApiUrl.replace(/\/$/, '') 
  : '';

/**
 * Helper to build API URLs
 */
export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
