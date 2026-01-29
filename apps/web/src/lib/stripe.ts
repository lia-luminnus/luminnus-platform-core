/**
 * Stripe Configuration and Price Mapping
 * Maps Stripe price IDs to plan details and commitment info
 */

// Stripe Price IDs per plan
export const STRIPE_PRICES = {
    Start: {
        monthly: 'price_1Ss0tJRy1wqZ6TIAcjxyXlSY',      // €29/mês (Atualizado de €30)
        annual_12x: 'price_1Ss1jqRy1wqZ6TIAxG8velbA',   // €26/mês (Atualizado de €27)
        annual_full: 'price_1SsNb4Ry1wqZ6TIA99p7OD9Z',  // €313/ano
    },
    Plus: {
        monthly: 'price_1SsNRoRy1wqZ6TIAK5ijPvTe',      // €249/mês
        annual_12x: 'price_1Ss22aRy1wqZ6TIAiuswrNIa',   // €199/mês (12x)
        annual_full: 'price_1Ss21RRy1wqZ6TIAsJhnc6ZI',  // €2.390/ano
    },
    Pro: {
        monthly: 'price_1Ss27nRy1wqZ6TIAXuXjx0ox',      // €1.499/mês
        annual_12x: 'price_1Ss289Ry1wqZ6TIAVghulaNw',   // €1.049/mês (12x)
        annual_full: 'price_1Ss26GRy1wqZ6TIAnHEU2UAG',  // €12.592/ano
    },
} as const;

// Mapping from Price ID to Plan Info
export const PRICE_TO_PLAN_MAP: Record<string, {
    plan: string;
    paymentType: 'monthly' | 'annual_12x' | 'annual_full';
    commitmentMonths: number;
    displayName: string;
}> = {
    // Start
    'price_1Ss0tJRy1wqZ6TIAcjxyXlSY': {
        plan: 'Start',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Start Mensal',
    },
    'price_1Ss1jqRy1wqZ6TIAxG8velbA': {
        plan: 'Start',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Start Anual (12x)',
    },
    'price_1Ss0rGRy1wqZ6TIAvx5HOD5Z': {
        plan: 'Start',
        paymentType: 'annual_full',
        commitmentMonths: 0,
        displayName: 'Start Anual (À Vista)',
    },
    // Plus
    'price_1Ss20JRy1wqZ6TIAKTAA3Cff': {
        plan: 'Plus',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Plus Mensal',
    },
    'price_1Ss22aRy1wqZ6TIAiuswrNIa': {
        plan: 'Plus',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Plus Anual (12x)',
    },
    'price_1Ss21RRy1wqZ6TIAsJhnc6ZI': {
        plan: 'Plus',
        paymentType: 'annual_full',
        commitmentMonths: 0,
        displayName: 'Plus Anual (À Vista)',
    },
    // Pro
    'price_1Ss27nRy1wqZ6TIAnHEU2UAG': {
        plan: 'Pro',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Pro Mensal',
    },
    'price_1Ss289Ry1wqZ6TIAVghulaNw': {
        plan: 'Pro',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Pro Anual (12x)',
    },
    'price_1Ss26GRy1wqZ6TIAnHEU2UAG': {
        plan: 'Pro',
        paymentType: 'annual_full',
        commitmentMonths: 0,
        displayName: 'Pro Anual (À Vista)',
    },
};

// Get plan info from price ID
export function getPlanFromPriceId(priceId: string) {
    return PRICE_TO_PLAN_MAP[priceId] || null;
}

// Get price IDs for a plan
export function getPricesForPlan(planName: keyof typeof STRIPE_PRICES) {
    return STRIPE_PRICES[planName];
}

// Check if price requires commitment
export function hasCommitment(priceId: string): boolean {
    const planInfo = PRICE_TO_PLAN_MAP[priceId];
    return planInfo?.commitmentMonths > 0;
}

// Calculate commitment end date
export function calculateCommitmentEndDate(priceId: string, startDate = new Date()): Date | null {
    const planInfo = PRICE_TO_PLAN_MAP[priceId];
    if (!planInfo || planInfo.commitmentMonths === 0) {
        return null;
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planInfo.commitmentMonths);
    return endDate;
}

export type PlanName = keyof typeof STRIPE_PRICES;
export type PaymentType = 'monthly' | 'annual_12x' | 'annual_full';
