import { supabase } from '../config/supabase.js';

// ============================================================
// CREDIT ALERT THRESHOLDS
// ============================================================
const ALERT_THRESHOLDS = [
    { threshold: 50, level: 'info', label: '50% dos créditos utilizados' },
    { threshold: 80, level: 'warning', label: '80% dos créditos utilizados' },
    { threshold: 95, level: 'critical', label: '95% dos créditos utilizados — quase no limite!' },
    { threshold: 100, level: 'exceeded', label: 'Créditos esgotados!' },
] as const;

type AlertLevel = 'info' | 'warning' | 'critical' | 'exceeded';

interface AlertCheckResult {
    alertSent: boolean;
    threshold?: number;
    level?: AlertLevel;
}

/**
 * CreditAlertService — Monitors credit usage and sends alerts
 * Uses deduplication table to avoid spam (max 1 alert per threshold per month)
 * Sends emails via Supabase Edge Function (email-service)
 */
export class CreditAlertService {

    /**
     * Check usage percentage and send alert if threshold crossed
     * Called after each debit — designed to be non-blocking
     */
    static async checkAndNotify(
        tenantId: string,
        percentualUso: number,
        saldoRestante: number
    ): Promise<AlertCheckResult> {
        try {
            // Find the highest threshold that was crossed
            const crossedThreshold = [...ALERT_THRESHOLDS]
                .reverse()
                .find(t => percentualUso >= t.threshold);

            if (!crossedThreshold) {
                return { alertSent: false };
            }

            // Check deduplication — already sent this threshold this month?
            const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

            if (!supabase) {
                console.warn('⚠️ [CreditAlert] Supabase não configurado');
                return { alertSent: false };
            }

            const { data: existing } = await supabase
                .from('credit_alerts_sent')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('threshold', crossedThreshold.threshold)
                .eq('periodo_mes', currentMonth)
                .maybeSingle();

            if (existing) {
                // Already sent this alert this month
                return { alertSent: false };
            }

            // Record alert to prevent duplicates
            const { error: insertError } = await supabase
                .from('credit_alerts_sent')
                .insert({
                    tenant_id: tenantId,
                    threshold: crossedThreshold.threshold,
                    periodo_mes: currentMonth,
                    tipo: crossedThreshold.level === 'exceeded' ? 'credit_exceeded' : 'credit_low',
                    email_sent: false,
                });

            if (insertError) {
                // Unique constraint = already exists, skip
                if (insertError.code === '23505') {
                    return { alertSent: false };
                }
                console.error(`❌ [CreditAlert] Erro ao registrar alerta:`, insertError);
                return { alertSent: false };
            }

            console.log(`🔔 [CreditAlert] Alerta ${crossedThreshold.level} (${crossedThreshold.threshold}%) para tenant ${tenantId} | Saldo: ${saldoRestante}`);

            // Try to send email notification via Edge Function (non-blocking)
            CreditAlertService.sendAlertEmail(tenantId, crossedThreshold, saldoRestante, percentualUso)
                .catch(err => console.error(`❌ [CreditAlert] Erro ao enviar email:`, err));

            return {
                alertSent: true,
                threshold: crossedThreshold.threshold,
                level: crossedThreshold.level,
            };
        } catch (err: any) {
            console.error(`❌ [CreditAlert] Exceção em checkAndNotify:`, err);
            return { alertSent: false };
        }
    }

    /**
     * Send alert email via the email-service Edge Function
     */
    private static async sendAlertEmail(
        tenantId: string,
        threshold: typeof ALERT_THRESHOLDS[number],
        saldoRestante: number,
        percentualUso: number
    ): Promise<void> {
        if (!supabase) return;

        // Get tenant owner email
        const ownerEmail = await CreditAlertService.getTenantOwnerEmail(tenantId);
        if (!ownerEmail) {
            console.warn(`⚠️ [CreditAlert] Não encontrou email do tenant ${tenantId}`);
            return;
        }

        const isExceeded = threshold.level === 'exceeded';
        const isCritical = threshold.level === 'critical';

        const subject = isExceeded
            ? '⚠️ Créditos esgotados — LIA Luminnus'
            : isCritical
                ? '🔴 Créditos quase no limite — LIA Luminnus'
                : `📊 ${threshold.threshold}% dos créditos utilizados — LIA Luminnus`;

        const colorBg = isExceeded ? '#dc2626' : isCritical ? '#f59e0b' : '#3b82f6';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0F1A; color: #ffffff; margin: 0; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
        <div style="text-align: center; padding: 40px 40px 20px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: ${colorBg}; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">${isExceeded ? '🚨' : isCritical ? '⚠️' : '📊'}</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">${threshold.label}</h1>
        </div>
        <div style="padding: 20px 40px;">
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; margin: 0 0 8px; font-size: 14px;">Uso atual</p>
                <p style="color: ${colorBg}; margin: 0; font-size: 36px; font-weight: 800;">${Math.round(percentualUso)}%</p>
                <p style="color: #6b7280; margin: 8px 0 0; font-size: 14px;">${saldoRestante} créditos restantes</p>
            </div>
        </div>
        ${isExceeded || isCritical ? `
        <div style="text-align: center; padding: 20px 40px;">
            <a href="https://luminnus.ai/dashboard" style="display: inline-block; background: linear-gradient(90deg, #8b5cf6, #3b82f6); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 15px; font-weight: 700;">
                Recarregar Créditos
            </a>
        </div>` : ''}
        <div style="text-align: center; padding: 20px 40px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Este alerta é enviado apenas uma vez por mês para cada nível de uso.</p>
        </div>
    </div>
</body>
</html>`;

        // Call email-service Edge Function
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';

        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/email-service/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    to: [ownerEmail],
                    subject,
                    html: htmlContent,
                    tenant_id: tenantId,
                    metadata: {
                        type: 'credit_alert',
                        threshold: threshold.threshold,
                        level: threshold.level,
                        percentual_uso: percentualUso,
                        saldo_restante: saldoRestante,
                    },
                }),
            });

            if (response.ok) {
                // Mark email as sent
                const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
                await supabase
                    .from('credit_alerts_sent')
                    .update({ email_sent: true })
                    .eq('tenant_id', tenantId)
                    .eq('threshold', threshold.threshold)
                    .eq('periodo_mes', currentMonth);

                console.log(`📧 [CreditAlert] Email de alerta enviado para ${ownerEmail}`);
            } else {
                const errText = await response.text();
                console.error(`❌ [CreditAlert] Erro ao enviar email: ${errText}`);
            }
        } catch (err) {
            console.error(`❌ [CreditAlert] Exceção ao enviar email:`, err);
        }
    }

    /**
     * Get the email of the tenant owner
     */
    private static async getTenantOwnerEmail(tenantId: string): Promise<string | null> {
        if (!supabase) return null;

        try {
            // Try tenant_users first
            const { data: tenantUser } = await supabase
                .from('tenant_users')
                .select('user_id')
                .eq('tenant_id', tenantId)
                .eq('role', 'owner')
                .maybeSingle();

            const userId = tenantUser?.user_id || tenantId;

            // Get email from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .maybeSingle();

            return profile?.email || null;
        } catch {
            return null;
        }
    }
}
