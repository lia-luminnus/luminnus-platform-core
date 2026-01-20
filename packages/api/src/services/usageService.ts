import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface PlanLimits {
    maxDailyLiaMinutes: number;
    maxMonthlyReports: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
    start: { maxDailyLiaMinutes: 60, maxMonthlyReports: 5 },
    plus: { maxDailyLiaMinutes: 300, maxMonthlyReports: 50 },
    pro: { maxDailyLiaMinutes: 1440, maxMonthlyReports: 500 } // Quase ilimitado
};

export class UsageService {

    static async getUsage(tenantId: string) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('daily_lia_minutes_used, monthly_reports_count, plan, last_quota_reset_at')
            .eq('id', tenantId)
            .single();

        if (error) throw error;
        return profile;
    }

    static async incrementMinutes(tenantId: string, minutes: number = 1) {
        const profile = await this.getUsage(tenantId);
        const plan = (profile.plan || 'start').toLowerCase();
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.start;

        if (profile.daily_lia_minutes_used + minutes > limits.maxDailyLiaMinutes) {
            throw new Error('QUOTA_EXCEEDED_MINUTES');
        }

        const { error } = await supabase.rpc('increment_lia_minutes', {
            t_id: tenantId,
            inc_val: minutes
        });

        if (error) throw error;
        return true;
    }

    static async incrementReports(tenantId: string) {
        const profile = await this.getUsage(tenantId);
        const plan = (profile.plan || 'start').toLowerCase();
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.start;

        if (profile.monthly_reports_count + 1 > limits.maxMonthlyReports) {
            throw new Error('QUOTA_EXCEEDED_REPORTS');
        }

        const { error } = await supabase.rpc('increment_monthly_reports', {
            t_id: tenantId
        });

        if (error) throw error;
        return true;
    }

    static async checkResetNeeded(tenantId: string) {
        // Lógica para resetar daily_lia_minutes_used se for um novo dia
        // E monthly_reports_count se for um novo mês
        const { data, error } = await supabase.rpc('check_and_reset_quotas', { t_id: tenantId });
        if (error) console.error('Error resetting quotas:', error);
        return data;
    }
}
