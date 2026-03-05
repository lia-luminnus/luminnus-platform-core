import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionStatus = 'active' | 'past_due' | 'frozen' | 'unpaid' | 'canceled' | 'none' | 'loading';

export function useSubscriptionStatus() {
    const { user } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus>('loading');
    const [planName, setPlanName] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setStatus('none');
            return;
        }

        const fetchStatus = async () => {
            try {
                const { data, error } = await (supabase
                    .from('subscriptions' as any) as any)
                    .select('status, plan_name')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'past_due', 'frozen', 'unpaid', 'incomplete'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error || !data) {
                    setStatus('none');
                    return;
                }

                setStatus(data.status as SubscriptionStatus);
                setPlanName(data.plan_name);
            } catch {
                setStatus('none');
            }
        };

        fetchStatus();

        // Listen for realtime changes
        const channel = supabase
            .channel('subscription-status')
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.new?.status) {
                        setStatus(payload.new.status as SubscriptionStatus);
                        setPlanName(payload.new.plan_name || null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return { status, planName, isFrozen: status === 'frozen' || status === 'unpaid' };
}
