import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (import.meta.env.DEV) {
  console.log('[Dashboard Diagnostic] Mode:', import.meta.env.MODE);
  console.log('[Dashboard Diagnostic] SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'OK' : 'MISSING');
  console.log('[Dashboard Diagnostic] SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
  console.log('[Dashboard Diagnostic] BACKEND_URL:', import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'MISSING');
}
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);