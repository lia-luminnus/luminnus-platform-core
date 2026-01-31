import { supabase } from '../config/supabase.js';
import { AutomationRunner } from './automationRunner.js';
import cron from 'node-cron';

export class AutomationScheduler {
    private static isRunning = false;

    static init() {
        console.log('⏰ [AutomationScheduler] Initialized');
        
        // Check every minute
        cron.schedule('* * * * *', () => {
            this.checkScheduledAutomations();
        });
    }

    private static async checkScheduledAutomations() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date().toISOString();

            // 1. Fetch active scheduled automations due to run
            const { data: automations, error } = await supabase
                .from('automations')
                .select('*')
                .eq('status', 'active')
                .eq('trigger_type', 'schedule')
                .eq('is_enabled', true)
                .lte('next_run_at', now);

            if (error) {
                console.error('[AutomationScheduler] Error fetching due automations:', error);
                return;
            }

            if (!automations || automations.length === 0) return;

            console.log(`⏰ [AutomationScheduler] Found ${automations.length} due automations`);

            for (const auto of automations) {
                try {
                    // Trigger the runner
                    await AutomationRunner.trigger(auto.id, auto.tenant_id, { scheduled: true }, 'system');

                    // Calculate next run date based on cron string
                    const nextRun = this.calculateNextRun(auto.trigger_config?.cron || '0 0 * * *');

                    // Update automation
                    await supabase.from('automations')
                        .update({ 
                            last_run_at: now,
                            next_run_at: nextRun.toISOString()
                        })
                        .eq('id', auto.id);

                } catch (autoErr) {
                    console.error(`[AutomationScheduler] Failed to trigger automation ${auto.id}:`, autoErr);
                }
            }

        } catch (err) {
            console.error('[AutomationScheduler] Critical error:', err);
        } finally {
            this.isRunning = false;
        }
    }

    private static calculateNextRun(cronString: string): Date {
        // Use a library like cron-parser or just mock for now
        // For MVP, if no parser available, add 24 hours
        const d = new Date();
        d.setMinutes(d.getMinutes() + 1440); // 24h fallback
        return d;
    }
}
