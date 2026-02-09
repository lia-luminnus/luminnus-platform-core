import { z } from 'zod';
import './envLoader.js'; // Ensure env vars are loaded first

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3006').transform(Number),
    ALLOWED_ORIGINS: z.string().default(''),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_KEY: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string(),

    // Google Auth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ [unifiedConfig] Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const config = {
    env: _env.data.NODE_ENV,
    isProduction: _env.data.NODE_ENV === 'production',
    isDev: _env.data.NODE_ENV !== 'production',
    port: _env.data.PORT,
    cors: {
        allowedOrigins: _env.data.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    },
    supabase: {
        url: _env.data.SUPABASE_URL,
        anonKey: _env.data.SUPABASE_ANON_KEY,
        serviceKey: _env.data.SUPABASE_SERVICE_KEY,
    },
    openai: {
        apiKey: _env.data.OPENAI_API_KEY,
    },
    google: {
        clientId: _env.data.GOOGLE_CLIENT_ID,
        clientSecret: _env.data.GOOGLE_CLIENT_SECRET,
    }
};
