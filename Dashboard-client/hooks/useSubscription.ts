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
    const { user } = useDashboardAuth();
    const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) {
            // No user yet - don't block loading, just return empty data
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active', 'past_due', 'incomplete'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

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
            // v5.6: Tabela invoices usa tenant_id, não user_id. 
            // Só buscamos se tivermos um tenant_id da subscription ou do user metadata
            let tenantId = subData?.tenant_id || (user.user_metadata as any)?.tenant_id;
            
            let invData: any[] = [];
            
            if (tenantId) {
                const { data } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });
                invData = data || [];
            } else {
                // Tenta buscar por customer_id como fallback se for igual ao user.id
                // Mas apenas se não tiver tenant_id para evitar query pesada
                 const { data } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('customer_id', user.id)
                    .order('created_at', { ascending: false });
                 invData = data || [];
            }

            if (invData) {
                setInvoices(invData.map(inv => ({
                    id: inv.id,
                    amount_paid: inv.amount_paid / 100, // Amout is usually in cents
                    currency: inv.currency,
                    status: inv.status,
                    created_at: inv.created_at,
                    invoice_pdf: inv.invoice_pdf,
                    description: inv.description
                })));
            }
        } catch (error) {
            console.error('[useSubscription] Error fetching billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    return { subscription, invoices, loading, refetch: fetchData };
};
