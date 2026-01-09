import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    segment: string | null;
    modules: string[] | null;
    onboarding_completed: boolean;
    onboarding_integrations_done: boolean;
    integrations_selected: string[];
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

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 5000)
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
        return {
            id: profile.id,
            email: profile.email || null,
            full_name: profile.full_name || null,
            role: profile.role || 'client',
            segment: profile.segment || null,
            modules: profile.modules || null,
            onboarding_completed: profile.onboarding_completed ?? false,
            onboarding_integrations_done: profile.onboarding_integrations_done ?? false,
            integrations_selected: profile.integrations_selected || [],
            created_at: profile.created_at || new Date().toISOString(),
            updated_at: profile.updated_at || new Date().toISOString()
        };
    } catch (err) {
        console.error('[ProfileService] Timeout ou erro fatal:', err);
        return null; // Fallback para não travar o AuthContext
    }
}

export async function createProfile(userId: string, email: string): Promise<UserProfile> {
    console.log(`[ProfileService] Criando perfil para: ${email} (${userId})...`);
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            role: 'client',
            onboarding_completed: false,
            onboarding_integrations_done: false,
            modules: []
        })
        .select()
        .single();

    if (error) {
        console.error('[ProfileService] Erro ao criar perfil:', error);
        if (error.code === '23505') {
            const existing = await getProfile(userId);
            if (existing) return existing;
        }
        throw error;
    }

    const profile = data as any;
    return {
        id: profile.id,
        email: profile.email || null,
        full_name: profile.full_name || null,
        role: profile.role || 'client',
        segment: profile.segment || null,
        modules: profile.modules || null,
        onboarding_completed: profile.onboarding_completed ?? false,
        onboarding_integrations_done: profile.onboarding_integrations_done ?? false,
        integrations_selected: profile.integrations_selected || [],
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || new Date().toISOString()
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

    const profile = updatedProfile as any;
    return {
        id: profile.id,
        email: profile.email || null,
        full_name: profile.full_name || null,
        role: profile.role || 'client',
        segment: data.segment,
        modules: data.modules,
        onboarding_completed: true,
        onboarding_integrations_done: profile.onboarding_integrations_done ?? false,
        integrations_selected: profile.integrations_selected || [],
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || new Date().toISOString()
    };
}
