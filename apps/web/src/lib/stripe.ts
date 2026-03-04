/**
 * Stripe Configuration and Price Mapping
 * Maps Stripe price IDs to plan details and commitment info
 * Currency: USD (dolarizado — Stripe converte automaticamente para moeda local)
 */

// Stripe Price IDs per plan (USD)
export const STRIPE_PRICES = {
    Start: {
        monthly: 'price_1T6xy5Ry1wqZ6TIAqMWlPsRx',       // $29/mês
        annual_12x: 'price_1T6xy6Ry1wqZ6TIAMSKVTvht',     // $312/ano ($26/mês — desconto 10%)
    },
    Plus: {
        monthly: 'price_1T6xy6Ry1wqZ6TIA2aRMn5IP',        // $99/mês
        annual_12x: 'price_1T6xy7Ry1wqZ6TIA1ckEOy6e',     // $948/ano ($79/mês — desconto 20%)
    },
    Pro: {
        monthly: 'price_1T6xy8Ry1wqZ6TIA3yWCsIDB',        // $249/mês
        annual_12x: 'price_1T6xy9Ry1wqZ6TIAavcWvZgw',     // $2.388/ano ($199/mês — desconto 20%)
    },
} as const;

// Mapping from Price ID to Plan Info
export const PRICE_TO_PLAN_MAP: Record<string, {
    plan: string;
    paymentType: 'monthly' | 'annual_12x';
    commitmentMonths: number;
    displayName: string;
}> = {
    // Start
    'price_1T6xy5Ry1wqZ6TIAqMWlPsRx': {
        plan: 'Start',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Start Mensal',
    },
    'price_1T6xy6Ry1wqZ6TIAMSKVTvht': {
        plan: 'Start',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Start Anual',
    },
    // Plus
    'price_1T6xy6Ry1wqZ6TIA2aRMn5IP': {
        plan: 'Plus',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Plus Mensal',
    },
    'price_1T6xy7Ry1wqZ6TIA1ckEOy6e': {
        plan: 'Plus',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Plus Anual',
    },
    // Pro
    'price_1T6xy8Ry1wqZ6TIA3yWCsIDB': {
        plan: 'Pro',
        paymentType: 'monthly',
        commitmentMonths: 0,
        displayName: 'Pro Mensal',
    },
    'price_1T6xy9Ry1wqZ6TIAavcWvZgw': {
        plan: 'Pro',
        paymentType: 'annual_12x',
        commitmentMonths: 12,
        displayName: 'Pro Anual',
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
export type PaymentType = 'monthly' | 'annual_12x';
