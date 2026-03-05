import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

export interface SubscriptionDetail {
    id: string;
    plan_name: 'Start' | 'Plus' | 'Pro';
    status: string;
    current_period_end: string;
    payment_type?: 'monthly' | 'annual_full' | 'annual_12x';
    cancel_at_period_end?: boolean;
}

export interface Invoice {
    id: string;
    amount_paid: number;
    currency: string;
    status: string;
    created_at: string;
    invoice_pdf?: string;
    description?: string;
}

export const useSubscription = () => {
    const { user, profile } = useDashboardAuth();
    const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Subscription
            const fetchSubPromise = supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active', 'past_due', 'incomplete'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SUB_TIMEOUT')), 5000));
            const { data: subData } = await Promise.race([fetchSubPromise, timeoutPromise]) as any;

            if (subData) {
                setSubscription({
                    id: subData.id,
                    plan_name: subData.plan_name,
                    status: subData.status,
                    current_period_end: subData.current_period_end,
                    payment_type: subData.payment_type,
                    cancel_at_period_end: subData.cancel_at_period_end
                });
            }

            // 2. Fetch Invoices
            const tenantId = profile?.tenant_id || user.id;
            const invoiceTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('INV_TIMEOUT')), 3000));

            try {
                const fetchInvPromise = supabase
                    .from('invoices')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });

                const { data: invData } = await Promise.race([fetchInvPromise, invoiceTimeoutPromise]) as any;

                if (invData) {
                    setInvoices(invData.map(inv => ({
                        id: inv.id,
                        amount_paid: inv.amount_paid / 100,
                        currency: inv.currency,
                        status: inv.status,
                        created_at: inv.created_at,
                        invoice_pdf: inv.invoice_pdf,
                        description: inv.description
                    })));
                }
            } catch (invError: any) {
                if (invError.message !== 'INV_TIMEOUT') {
                    console.warn('[useSubscription] Invoice fetch failed:', invError.message);
                }
                setInvoices([]);
            }

        } catch (error: any) {
            // v6.3: Capturar QUALQUER erro (timeout, network, RLS, etc.)
            if (error.message === 'SUB_TIMEOUT') {
                console.warn('[useSubscription] Subscription timeout (using fallback)');
            } else {
                console.warn('[useSubscription] Error fetching billing data (non-blocking):', error.message || error.code);
            }
            // Definir valores vazios como fallback para não travar UI
            setSubscription(null);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    return { subscription, invoices, loading, refetch: fetchData };
};
