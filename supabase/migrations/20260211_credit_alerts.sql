-- ==========================================================
-- credit_alerts_sent: Deduplication table for credit alerts
-- Prevents sending the same alert multiple times per period
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.credit_alerts_sent (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    threshold integer NOT NULL CHECK (threshold IN (50, 80, 95, 100)),
    periodo_mes date NOT NULL DEFAULT date_trunc('month', now())::date,
    tipo text NOT NULL DEFAULT 'credit_low',
    email_sent boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, threshold, periodo_mes)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_alerts_tenant_month
    ON public.credit_alerts_sent (tenant_id, periodo_mes);

-- RLS
ALTER TABLE public.credit_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on credit_alerts_sent"
    ON public.credit_alerts_sent
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Tenant can view own credit alerts"
    ON public.credit_alerts_sent
    FOR SELECT
    USING (tenant_id = auth.uid()::uuid);

COMMENT ON TABLE public.credit_alerts_sent IS 'Deduplication table for credit usage alerts - max 1 alert per threshold per month per tenant';
