import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tax_id: string | null;
    role: string | null;
    segment: string | null;
    modules: string[] | null;
    onboarding_completed: boolean;
    onboarding_integrations_done: boolean;
    integrations_selected: string[];
    plan_type: string | null;
    created_at: string;
    updated_at: string;
}

export interface OnboardingData {
    segment: string;
    modules: string[];
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
    console.log(`[ProfileService] Buscando perfil para: ${userId}...`);
    if (!supabase) return null;

    // v7.0: Cache-first strategy - Tentar cache primeiro
    const cacheKey = `profile_cache_${userId}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        try {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            const TTL = 2 * 60 * 1000; // 2min TTL (reduzido para evitar dados obsoletos)

            if (age < TTL) {
                console.log(`[ProfileService] ✅ Using cached profile (age: ${Math.round(age / 1000)}s)`);
                // Revalidate em background (não bloqueia UI)
                setTimeout(() => revalidateProfile(userId), 100);
                return data;
            } else {
                console.log(`[ProfileService] ⚠️ Cache expired (age: ${Math.round(age / 1000)}s), fetching fresh`);
            }
        } catch (e) {
            console.warn('[ProfileService] Cache parse error, ignoring:', e);
        }
    }

    // v7.1: Timeout ajustado para 8s (balanço entre UX e confiabilidade)
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 8000)
    );

    try {
        const fetchPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('[ProfileService] Perfil não encontrado (PGRST116)');
                return null;
            }
            console.error('[ProfileService] Erro ao buscar perfil:', error);
            throw error;
        }

        console.log('[ProfileService] Perfil carregado com sucesso');

        const profile = data as any;
        const userProfile: UserProfile = {
            id: profile.id,
            email: profile.email || null,
            full_name: profile.full_name || null,
            avatar_url: profile.avatar_url || null,
            company_name: profile.company_name || null,
            phone: profile.phone || null,
            address: profile.address || null,
            city: profile.city || null,
            state: profile.state || null,
            postal_code: profile.postal_code || null,
            country: profile.country || 'Brasil',
            tax_id: profile.tax_id || null,
            role: profile.role || 'client',
            segment: profile.segment || null,
            modules: profile.modules || null,
            onboarding_completed: profile.onboarding_completed ?? false,
            onboarding_integrations_done: profile.onboarding_integrations_done ?? false,
            integrations_selected: profile.integrations_selected || [],
            plan_type: profile.plan_type || null,
            created_at: profile.created_at || new Date().toISOString(),
            updated_at: profile.updated_at || new Date().toISOString()
        };

        // v7.0: Salvar no cache
        localStorage.setItem(cacheKey, JSON.stringify({
            data: userProfile,
            timestamp: Date.now()
        }));

        return userProfile;
    } catch (err: any) {
        if (err.message === 'DB_TIMEOUT') {
            console.warn('[ProfileService] Timeout na busca de perfil (usando fallback)');
        } else {
            console.warn('[ProfileService] Erro no perfil (usando fallback):', err.message || err.code);
        }
        return null; // Fallback para não travar o AuthContext
    }
}

export async function createProfile(userId: string, email: string): Promise<UserProfile> {
    console.log(`[ProfileService] Criando perfil para: ${email} (${userId})...`);
    if (!supabase) throw new Error('Supabase not initialized');

    // Usar upsert para evitar conflitos 409 quando perfil já existe
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            role: 'client',
            onboarding_completed: false,
            onboarding_integrations_done: false,
            modules: [],
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'id',
            ignoreDuplicates: false // Atualiza se existir
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            // Silenciosamente buscar o perfil existente se houver conflito de chave única
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('RETRY_TIMEOUT')), 15000)
            );

            const { data: retryData } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (retryData) {
                const profileData = retryData as any;
                return {
                    id: profileData.id,
                    email: profileData.email || null,
                    full_name: profileData.full_name || null,
                    avatar_url: profileData.avatar_url || null,
                    company_name: profileData.company_name || null,
                    phone: profileData.phone || null,
                    address: profileData.address || null,
                    city: profileData.city || null,
                    state: profileData.state || null,
                    postal_code: profileData.postal_code || null,
                    country: profileData.country || 'Brasil',
                    tax_id: profileData.tax_id || null,
                    role: profileData.role || 'client',
                    segment: profileData.segment || null,
                    modules: profileData.modules || null,
                    onboarding_completed: profileData.onboarding_completed ?? false,
                    onboarding_integrations_done: profileData.onboarding_integrations_done ?? false,
                    integrations_selected: profileData.integrations_selected || [],
                    plan_type: profileData.plan_type || null,
                    created_at: profileData.created_at || new Date().toISOString(),
                    updated_at: profileData.updated_at || new Date().toISOString()
                };
            }
        }
        throw error;
    }

    const createdProfile = data as any;
    return {
        id: createdProfile.id,
        email: createdProfile.email || null,
        full_name: createdProfile.full_name || null,
        avatar_url: createdProfile.avatar_url || null,
        company_name: createdProfile.company_name || null,
        phone: createdProfile.phone || null,
        address: createdProfile.address || null,
        city: createdProfile.city || null,
        state: createdProfile.state || null,
        postal_code: createdProfile.postal_code || null,
        country: createdProfile.country || 'Brasil',
        tax_id: createdProfile.tax_id || null,
        role: createdProfile.role || 'client',
        segment: createdProfile.segment || null,
        modules: createdProfile.modules || null,
        onboarding_completed: createdProfile.onboarding_completed ?? false,
        onboarding_integrations_done: createdProfile.onboarding_integrations_done ?? false,
        integrations_selected: createdProfile.integrations_selected || [],
        plan_type: createdProfile.plan_type || null,
        created_at: createdProfile.created_at || new Date().toISOString(),
        updated_at: createdProfile.updated_at || new Date().toISOString()
    };
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
        .from('profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('[ProfileService] Erro ao atualizar perfil:', error);
        throw error;
    }

    const profileData = data as any;
    return {
        id: profileData.id,
        email: profileData.email || null,
        full_name: profileData.full_name || null,
        avatar_url: profileData.avatar_url || null,
        company_name: profileData.company_name || null,
        phone: profileData.phone || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        postal_code: profileData.postal_code || null,
        country: profileData.country || 'Brasil',
        tax_id: profileData.tax_id || null,
        role: profileData.role || 'client',
        segment: profileData.segment || null,
        modules: profileData.modules || null,
        onboarding_completed: profileData.onboarding_completed ?? false,
        onboarding_integrations_done: profileData.onboarding_integrations_done ?? false,
        integrations_selected: profileData.integrations_selected || [],
        plan_type: profileData.plan_type || null,
        created_at: profileData.created_at || new Date().toISOString(),
        updated_at: profileData.updated_at || new Date().toISOString()
    };
}

export async function getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
    let profile = await getProfile(userId);
    if (!profile) {
        profile = await createProfile(userId, email);
    }
    return profile;
}

export async function completeOnboarding(
    userId: string,
    data: OnboardingData
): Promise<UserProfile> {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            onboarding_completed: true,
            segment: data.segment,
            modules: data.modules,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('[ProfileService] Error completing onboarding:', error);
        throw error;
    }

    const profileData = updatedProfile as any;
    return {
        id: profileData.id,
        email: profileData.email || null,
        full_name: profileData.full_name || null,
        avatar_url: profileData.avatar_url || null,
        company_name: profileData.company_name || null,
        phone: profileData.phone || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        postal_code: profileData.postal_code || null,
        country: profileData.country || 'Brasil',
        tax_id: profileData.tax_id || null,
        role: profileData.role || 'client',
        segment: data.segment,
        modules: data.modules,
        onboarding_completed: true,
        onboarding_integrations_done: profileData.onboarding_integrations_done ?? false,
        integrations_selected: profileData.integrations_selected || [],
        plan_type: profileData.plan_type || null,
        created_at: profileData.created_at || new Date().toISOString(),
        updated_at: profileData.updated_at || new Date().toISOString()
    };
}

// v7.0: Background revalidation (não bloqueia UI)
async function revalidateProfile(userId: string): Promise<void> {
    if (!supabase) return;

    const cacheKey = `profile_cache_${userId}`;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('REVALIDATE_TIMEOUT')), 3000)
    );

    try {
        const fetchPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (!error && data) {
            console.log('[ProfileService] 🔄 Cache revalidated');
            const profile = data as any;
            const userProfile: UserProfile = {
                id: profile.id,
                email: profile.email || null,
                full_name: profile.full_name || null,
                avatar_url: profile.avatar_url || null,
                company_name: profile.company_name || null,
                phone: profile.phone || null,
                address: profile.address || null,
                city: profile.city || null,
                state: profile.state || null,
                postal_code: profile.postal_code || null,
                country: profile.country || 'Brasil',
                tax_id: profile.tax_id || null,
                role: profile.role || 'client',
                segment: profile.segment || null,
                modules: profile.modules || null,
                onboarding_completed: profile.onboarding_completed ?? false,
                onboarding_integrations_done: profile.onboarding_integrations_done ?? false,
                integrations_selected: profile.integrations_selected || [],
                plan_type: profile.plan_type || null,
                created_at: profile.created_at || new Date().toISOString(),
                updated_at: profile.updated_at || new Date().toISOString()
            };

            localStorage.setItem(cacheKey, JSON.stringify({
                data: userProfile,
                timestamp: Date.now()
            }));
        }
    } catch (err) {
        // Silent fail - cache permanece válido
        console.warn('[ProfileService] Revalidation failed (cache unchanged)');
    }
}

// v7.0: Clear cache on logout
export function clearProfileCache(userId?: string): void {
    if (userId) {
        localStorage.removeItem(`profile_cache_${userId}`);
        console.log('[ProfileService] Cache cleared for user:', userId);
    } else {
        // Clear all profile caches
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('profile_cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('[ProfileService] All profile caches cleared');
    }
}


export async function uploadAvatar(userId: string, file: File): Promise<string> {
    if (!supabase) throw new Error('Supabase not initialized');

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('[ProfileService] Uploading to:', filePath);
    // DEBUG: Verificar se a URL está carregada
    console.log('[ProfileService] Supabase URL configured:', import.meta.env.VITE_SUPABASE_URL ? 'YES' : 'NO');

    const uploadPromise = supabase.storage
        .from('avatars')
        .upload(filePath, file);

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), 15000));

    const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

    if (uploadError) {
        console.error('[ProfileService] Upload failed:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return data.publicUrl;
}
