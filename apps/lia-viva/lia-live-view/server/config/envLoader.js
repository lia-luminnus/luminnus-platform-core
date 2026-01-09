import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple locations
// config -> server -> lia-live-view -> lia-viva -> apps -> root (5 levels)
const rootPath = path.resolve(__dirname, '..', '..', '..', '..', '..');

const envPaths = [
    path.join(rootPath, '.env.development'),
    path.join(rootPath, '.env'),
    path.resolve(__dirname, '..', '..', '..', 'web', 'api', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '..', '.env'),
];

for (const envPath of envPaths) {
    dotenv.config({ path: envPath, override: true });
}

if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('⚠️  [EnvLoader] GOOGLE_CLIENT_ID not found');
}
if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  [EnvLoader] SUPABASE_SERVICE_KEY not found');
}
