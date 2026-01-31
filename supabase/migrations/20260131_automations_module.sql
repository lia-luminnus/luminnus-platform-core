-- ==========================================================
-- AUTOMATIONS MODULE - MIGRATION
-- ==========================================================

-- 1. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'error', 'draft', 'archived')),
    trigger_type text NOT NULL CHECK (trigger_type IN ('schedule', 'event', 'keyword', 'webhook', 'manual')),
    trigger_config jsonb DEFAULT '{}',
    flow_definition jsonb DEFAULT '[]', -- React Flow nodes/edges
    version integer DEFAULT 1,
    is_enabled boolean DEFAULT true,
    last_run_at timestamptz,
    next_run_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Automation Runs (History)
CREATE TABLE IF NOT EXISTS public.automation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    started_at timestamptz DEFAULT now(),
    finished_at timestamptz,
    duration_ms integer,
    input_payload jsonb DEFAULT '{}',
    output_payload jsonb DEFAULT '{}',
    error_message text,
    initiated_by text DEFAULT 'system' CHECK (initiated_by IN ('system', 'user', 'lia', 'webhook')),
    correlation_id text,
    created_at timestamptz DEFAULT now()
);

-- 3. Automation Logs (Detailed steps)
CREATE TABLE IF NOT EXISTS public.automation_run_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid REFERENCES public.automation_runs(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    level text DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message text,
    data jsonb,
    created_at timestamptz DEFAULT now()
);

-- 4. Automation Limits (Plan Constraints)
CREATE TABLE IF NOT EXISTS public.automation_limits (
    plan text PRIMARY KEY CHECK (plan IN ('start', 'plus', 'pro')),
    max_automations integer NOT NULL,
    max_runs_per_day integer NOT NULL,
    allowed_triggers jsonb DEFAULT '[]',
    allowed_integrations jsonb DEFAULT '[]'
);

-- Seed Limits
INSERT INTO public.automation_limits (plan, max_automations, max_runs_per_day, allowed_triggers, allowed_integrations)
VALUES 
('start', 3, 50, '["schedule", "manual"]', '["email", "sheets"]'),
('plus', 10, 200, '["schedule", "manual", "event"]', '["email", "sheets", "whatsapp", "calendar"]'),
('pro', 100, 1000, '["schedule", "manual", "event", "webhook", "keyword"]', '["email", "sheets", "whatsapp", "calendar", "crm", "webhook"]')
ON CONFLICT (plan) DO UPDATE SET 
    max_automations = EXCLUDED.max_automations,
    max_runs_per_day = EXCLUDED.max_runs_per_day;

-- 5. RLS Policies

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_limits ENABLE ROW LEVEL SECURITY;

-- Automations Policies
CREATE POLICY "Access own tenant automations" ON public.automations
    FOR ALL USING (
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );

-- Runs Policies
CREATE POLICY "Access own tenant runs" ON public.automation_runs
    FOR ALL USING (
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );

-- Logs Policies
CREATE POLICY "Access own tenant logs" ON public.automation_run_logs
    FOR ALL USING (
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );

-- Limits Policies (Read-only public)
CREATE POLICY "Read limits" ON public.automation_limits
    FOR SELECT USING (true);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_automations_tenant ON public.automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON public.automations(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_auto_id ON public.automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_tenant ON public.automation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_id ON public.automation_run_logs(run_id);
