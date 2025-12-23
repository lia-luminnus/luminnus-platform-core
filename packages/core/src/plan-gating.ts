// ============================================================
// LUMINNUS PLATFORM CORE - Plan Gating Logic
// ============================================================

import { PLAN_FEATURES, PLAN_IDS } from '@luminnus/shared';

export type PlanId = keyof typeof PLAN_FEATURES;

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(planId: string, feature: string): boolean {
    const features = PLAN_FEATURES[planId as PlanId];
    return features ? features.includes(feature as any) : false;
}

/**
 * Get all features for a plan
 */
export function getPlanFeatures(planId: string): readonly string[] {
    return PLAN_FEATURES[planId as PlanId] || [];
}

/**
 * Check if user can access a specific LIA mode
 */
export function canAccessMode(planId: string, mode: 'chat' | 'multimodal' | 'live'): boolean {
    return hasFeature(planId, mode);
}

/**
 * Get available modes for a plan
 */
export function getAvailableModes(planId: string): string[] {
    const allModes = ['chat', 'multimodal', 'live'];
    return allModes.filter(mode => hasFeature(planId, mode));
}

/**
 * Check if an upgrade is needed to access a feature
 */
export function needsUpgrade(currentPlanId: string, requiredFeature: string): {
    needed: boolean;
    suggestedPlan?: string;
} {
    if (hasFeature(currentPlanId, requiredFeature)) {
        return { needed: false };
    }

    // Find the cheapest plan with the feature
    const plans = [PLAN_IDS.START, PLAN_IDS.PLUS, PLAN_IDS.PRO];
    for (const plan of plans) {
        if (hasFeature(plan, requiredFeature)) {
            return { needed: true, suggestedPlan: plan };
        }
    }

    return { needed: true };
}
