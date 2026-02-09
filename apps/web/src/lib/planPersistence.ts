import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'start' | 'plus' | 'pro';

/**
 * Saves the user's plan type to the profiles table.
 * This is the fallback mechanism for plan detection when no Stripe subscription exists.
 */
export async function saveUserPlanType(userId: string, planType: PlanType): Promise<boolean> {
    const { error } = await supabase
        .from('profiles')
        .update({ plan_type: planType.toLowerCase() })
        .eq('id', userId);

    if (error) {
        console.error('[saveUserPlanType] Error saving plan_type:', error);
        throw error;
    }

    console.log('[saveUserPlanType] Successfully saved plan_type:', planType, 'for user:', userId);
    return true;
}

/**
 * Gets the user's current plan type from profiles table.
 */
export async function getUserPlanType(userId: string): Promise<PlanType | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[getUserPlanType] Error fetching plan_type:', error);
        return null;
    }

    return (data as { plan_type: string } | null)?.plan_type as PlanType | null;
}
