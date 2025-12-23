import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configuração robusta de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/config/env.ts -> src/config -> src -> packages/api -> root
const rootDir = path.resolve(__dirname, '../../../../');

console.log('[ENV] Root Dir detected:', rootDir);

// Carrega primeiro o .env base da raiz do monorepo
dotenv.config({ path: path.resolve(rootDir, '.env') });

// Sobrescreve com .env.development se existir
dotenv.config({ path: path.resolve(rootDir, '.env.development'), override: true });

// Logs de debug no boot (sem segredos)
console.log('[ENV] APP_URL:', process.env.APP_URL);
console.log('[ENV] GOOGLE_CLIENT_ID loaded:', !!process.env.GOOGLE_CLIENT_ID);
console.log('[ENV] SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

export const config = {
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000'
};
