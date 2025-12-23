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

/**
 * Get user profile from Supabase
 * Returns null if profile doesn't exist
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        // PGRST116 = Row not found, this is expected for new users
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('[ProfileService] Error fetching profile:', error);
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

/**
 * Create a new user profile
 * Note: The trigger on auth.users should auto-create profiles,
 * but this is a fallback for edge cases
 */
export async function createProfile(userId: string, email: string): Promise<UserProfile> {
    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            role: 'client',
            onboarding_completed: false,
            onboarding_integrations_done: false,
            modules: [],
            integrations_selected: []
        })
        .select()
        .single();

    if (error) {
        // Profile might already exist due to trigger - try to fetch it
        if (error.code === '23505') { // Unique constraint violation
            console.log('[ProfileService] Profile already exists, fetching...');
            const existing = await getProfile(userId);
            if (existing) return existing;
        }
        console.error('[ProfileService] Error creating profile:', error);
        throw error;
    }

    console.log('[ProfileService] Created new profile for:', email);

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

/**
 * Get or create user profile
 * Ensures profile always exists
 */
export async function getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
    let profile = await getProfile(userId);

    if (!profile) {
        console.log('[ProfileService] Profile not found, creating for:', email);
        profile = await createProfile(userId, email);
    }

    return profile;
}

/**
 * Update onboarding status and save selected segment/modules
 */
export async function completeOnboarding(
    userId: string,
    data: OnboardingData
): Promise<UserProfile> {
    const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
            onboarding_completed: true,
            segment: data.segment,
            modules: data.modules
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('[ProfileService] Error completing onboarding:', error);
        throw error;
    }

    console.log('[ProfileService] Onboarding completed for user:', userId);

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

/**
 * Update profile modules (for settings changes)
 */
export async function updateModules(
    userId: string,
    modules: string[]
): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ modules: modules })
        .eq('id', userId);

    if (error) {
        console.error('[ProfileService] Error updating modules:', error);
        throw error;
    }
}

/**
 * Reset onboarding (for testing/admin purposes)
 */
export async function resetOnboarding(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({
            onboarding_completed: false,
            onboarding_integrations_done: false,
            segment: null,
            modules: [],
            integrations_selected: []
        })
        .eq('id', userId);

    if (error) {
        console.error('[ProfileService] Error resetting onboarding:', error);
        throw error;
    }

    console.log('[ProfileService] Onboarding reset for user:', userId);
}

/**
 * Complete integrations onboarding (first access flow)
 */
export async function completeIntegrationsOnboarding(
    userId: string,
    integrations: string[]
): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({
            onboarding_integrations_done: true,
            integrations_selected: integrations
        })
        .eq('id', userId);

    if (error) {
        console.error('[ProfileService] Error completing integrations onboarding:', error);
        throw error;
    }

    console.log('[ProfileService] Integrations onboarding completed for user:', userId);
}

/**
 * Update selected integrations
 */
export async function updateIntegrations(
    userId: string,
    integrations: string[]
): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ integrations_selected: integrations })
        .eq('id', userId);

    if (error) {
        console.error('[ProfileService] Error updating integrations:', error);
        throw error;
    }
}

