import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
    id: string;
    user_id: string;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    stripe_price_id: string;
    plan_name: string;
    payment_type: 'monthly' | 'annual_12x' | 'annual_full';
    status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
    commitment_end_date: string | null;
    commitment_months: number;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
}

export interface SubscriptionStatus {
    hasActiveSubscription: boolean;
    subscription: Subscription | null;
    isInCommitment: boolean;
    monthsRemainingInCommitment: number;
    canCancel: boolean;
    cancellationWarning: string | null;
}

export function useSubscription() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        loadSubscription();
    }, []);

    const loadSubscription = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSubscription(null);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            setSubscription(data || null);
        } catch (err) {
            console.error('Error loading subscription:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const getSubscriptionStatus = (): SubscriptionStatus => {
        if (!subscription) {
            return {
                hasActiveSubscription: false,
                subscription: null,
                isInCommitment: false,
                monthsRemainingInCommitment: 0,
                canCancel: true,
                cancellationWarning: null,
            };
        }

        const now = new Date();
        const commitmentEnd = subscription.commitment_end_date
            ? new Date(subscription.commitment_end_date)
            : null;

        const isInCommitment = commitmentEnd ? commitmentEnd > now : false;

        let monthsRemaining = 0;
        if (isInCommitment && commitmentEnd) {
            const diffTime = commitmentEnd.getTime() - now.getTime();
            monthsRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        }

        const canCancel = !isInCommitment;
        const cancellationWarning = isInCommitment
            ? `Você está em período de fidelidade até ${commitmentEnd?.toLocaleDateString('pt-BR')}. Cancelar antes pode gerar multa.`
            : null;

        return {
            hasActiveSubscription: true,
            subscription,
            isInCommitment,
            monthsRemainingInCommitment: monthsRemaining,
            canCancel,
            cancellationWarning,
        };
    };

    return {
        subscription,
        loading,
        error,
        refetch: loadSubscription,
        status: getSubscriptionStatus(),
    };
}
