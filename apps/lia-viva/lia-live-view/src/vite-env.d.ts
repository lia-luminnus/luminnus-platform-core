/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_USE_3D_AVATAR?: string;
    readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
