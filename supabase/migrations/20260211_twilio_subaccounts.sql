-- ==========================================================
-- 🔗 TWILIO SUBACCOUNTS: Multi-Tenant WhatsApp via Twilio
-- ==========================================================
-- Migração: 20260211_twilio_subaccounts.sql
-- Objetivo: Suportar Twilio Subaccounts para WhatsApp multi-tenant
-- REGRA: Não remover nem alterar tabelas existentes (aditivo)

-- ==========================================================
-- A) TABELA PRINCIPAL: twilio_subaccounts
-- ==========================================================
CREATE TABLE IF NOT EXISTS twilio_subaccounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,

    -- Credenciais Twilio da Subconta
    twilio_account_sid TEXT NOT NULL,
    twilio_auth_token_encrypted TEXT NOT NULL,

    -- Número atribuído
    twilio_phone_number TEXT,
    twilio_phone_sid TEXT,

    -- Onboarding
    onboarding_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (onboarding_status IN (
            'pending', 'provisioning', 'number_search',
            'number_acquired', 'webhook_configured',
            'active', 'failed', 'suspended'
        )),
    onboarding_flow TEXT NOT NULL DEFAULT 'new_number'
        CHECK (onboarding_flow IN ('new_number', 'byon')),
    onboarding_error TEXT,
    onboarding_steps_json JSONB DEFAULT '[]'::jsonb,

    -- Billing
    billing_mode TEXT DEFAULT 'start_plan'
        CHECK (billing_mode IN ('start_plan', 'plus_plan', 'enterprise')),

    -- Webhook config
    webhook_url TEXT,
    webhook_configured_at TIMESTAMPTZ,

    -- Meta association (para BYON que veio do Embedded Signup)
    meta_waba_id TEXT,
    meta_phone_number_id TEXT,
    meta_business_id TEXT,

    -- Friendly name na Twilio
    friendly_name TEXT,

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ
);

COMMENT ON TABLE twilio_subaccounts IS 'Subcontas Twilio para isolamento multi-tenant de WhatsApp';
COMMENT ON COLUMN twilio_subaccounts.twilio_auth_token_encrypted IS 'Auth token encriptado com AES-256-GCM. Nunca armazenar em texto claro.';
COMMENT ON COLUMN twilio_subaccounts.onboarding_steps_json IS 'Log de cada passo do onboarding: [{step, status, timestamp, details}]';

-- ==========================================================
-- B) TABELA DE LOGS: twilio_onboarding_logs
-- ==========================================================
CREATE TABLE IF NOT EXISTS twilio_onboarding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subaccount_id UUID REFERENCES twilio_subaccounts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'failed', 'rolled_back')),
    details_json JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE twilio_onboarding_logs IS 'Log detalhado de cada ação do onboarding Twilio para auditoria';

-- ==========================================================
-- C) TABELA DE USAGE: twilio_usage_daily
-- ==========================================================
CREATE TABLE IF NOT EXISTS twilio_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subaccount_id UUID REFERENCES twilio_subaccounts(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    cost_usd NUMERIC(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

COMMENT ON TABLE twilio_usage_daily IS 'Agregação diária de uso por subconta para monitoramento e billing';

-- ==========================================================
-- D) ALTERAÇÕES ADITIVAS em whatsapp_connections
-- ==========================================================
ALTER TABLE whatsapp_connections
    ADD COLUMN IF NOT EXISTS twilio_subaccount_id UUID REFERENCES twilio_subaccounts(id),
    ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'meta';

COMMENT ON COLUMN whatsapp_connections.provider_type IS 'Tipo de provedor: meta (Cloud API direta) ou twilio (via subconta)';
COMMENT ON COLUMN whatsapp_connections.twilio_subaccount_id IS 'Referência à subconta Twilio quando provider_type = twilio';

-- ==========================================================
-- E) ÍNDICES
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_twilio_sub_tenant ON twilio_subaccounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_twilio_sub_sid ON twilio_subaccounts(twilio_account_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_sub_phone ON twilio_subaccounts(twilio_phone_number);
CREATE INDEX IF NOT EXISTS idx_twilio_sub_status ON twilio_subaccounts(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_twilio_logs_tenant ON twilio_onboarding_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_twilio_logs_action ON twilio_onboarding_logs(action);
CREATE INDEX IF NOT EXISTS idx_twilio_usage_tenant_date ON twilio_usage_daily(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_provider ON whatsapp_connections(provider_type);

-- ==========================================================
-- F) RLS (Row Level Security)
-- ==========================================================
ALTER TABLE twilio_subaccounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_onboarding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_usage_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_twilio_subaccounts') THEN
        CREATE POLICY allow_all_twilio_subaccounts ON twilio_subaccounts FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_twilio_onboarding_logs') THEN
        CREATE POLICY allow_all_twilio_onboarding_logs ON twilio_onboarding_logs FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_twilio_usage_daily') THEN
        CREATE POLICY allow_all_twilio_usage_daily ON twilio_usage_daily FOR ALL USING (true);
    END IF;
END $$;

-- ==========================================================
-- G) FUNÇÕES RPC
-- ==========================================================

-- Buscar subconta ativa por tenant
CREATE OR REPLACE FUNCTION get_twilio_subaccount(p_tenant_id UUID)
RETURNS twilio_subaccounts AS $$
DECLARE
    v_sub twilio_subaccounts;
BEGIN
    SELECT * INTO v_sub
    FROM twilio_subaccounts
    WHERE tenant_id = p_tenant_id
      AND onboarding_status = 'active'
    LIMIT 1;

    RETURN v_sub;
END;
$$ LANGUAGE plpgsql;

-- Atualizar status do onboarding com log automático
CREATE OR REPLACE FUNCTION update_onboarding_status(
    p_tenant_id UUID,
    p_new_status TEXT,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_error TEXT DEFAULT NULL
) RETURNS twilio_subaccounts AS $$
DECLARE
    v_sub twilio_subaccounts;
    v_old_status TEXT;
BEGIN
    -- Buscar status atual
    SELECT onboarding_status INTO v_old_status
    FROM twilio_subaccounts WHERE tenant_id = p_tenant_id;

    -- Atualizar subconta
    UPDATE twilio_subaccounts
    SET onboarding_status = p_new_status,
        onboarding_error = CASE WHEN p_new_status = 'failed' THEN p_error ELSE NULL END,
        updated_at = NOW(),
        activated_at = CASE WHEN p_new_status = 'active' THEN NOW() ELSE activated_at END,
        suspended_at = CASE WHEN p_new_status = 'suspended' THEN NOW() ELSE suspended_at END,
        onboarding_steps_json = onboarding_steps_json || jsonb_build_array(
            jsonb_build_object(
                'step', p_action,
                'old_status', v_old_status,
                'new_status', p_new_status,
                'timestamp', NOW(),
                'details', p_details
            )
        )
    WHERE tenant_id = p_tenant_id
    RETURNING * INTO v_sub;

    -- Registrar log
    INSERT INTO twilio_onboarding_logs (
        tenant_id, subaccount_id, action, status, details_json, error_message
    ) VALUES (
        p_tenant_id,
        v_sub.id,
        p_action,
        CASE WHEN p_new_status = 'failed' THEN 'failed' ELSE 'success' END,
        p_details || jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status),
        p_error
    );

    RETURN v_sub;
END;
$$ LANGUAGE plpgsql;

-- Top consumers (subcontas com mais mensagens nas últimas N horas)
CREATE OR REPLACE FUNCTION get_twilio_top_consumers(p_hours INTEGER DEFAULT 24, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    tenant_id UUID,
    friendly_name TEXT,
    twilio_phone_number TEXT,
    billing_mode TEXT,
    total_sent BIGINT,
    total_received BIGINT,
    total_cost NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.tenant_id,
        s.friendly_name,
        s.twilio_phone_number,
        s.billing_mode,
        COALESCE(SUM(u.messages_sent), 0) AS total_sent,
        COALESCE(SUM(u.messages_received), 0) AS total_received,
        COALESCE(SUM(u.cost_usd), 0) AS total_cost
    FROM twilio_subaccounts s
    LEFT JOIN twilio_usage_daily u ON u.subaccount_id = s.id
        AND u.date >= (CURRENT_DATE - (p_hours / 24))
    WHERE s.onboarding_status = 'active'
    GROUP BY s.tenant_id, s.friendly_name, s.twilio_phone_number, s.billing_mode
    ORDER BY total_sent DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_twilio_subaccount IS 'Retorna a subconta Twilio ativa de um tenant';
COMMENT ON FUNCTION update_onboarding_status IS 'Atualiza status de onboarding com log automático';
COMMENT ON FUNCTION get_twilio_top_consumers IS 'Top subcontas por volume de mensagens para monitoramento admin';

-- ==========================================================
-- FIM DA MIGRAÇÃO: TWILIO SUBACCOUNTS
-- ==========================================================
