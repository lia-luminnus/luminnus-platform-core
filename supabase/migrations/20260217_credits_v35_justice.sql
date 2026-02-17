-- ==========================================================
-- CREDITS v3.5 — Correções Start=1500, number_subscriptions
-- Migration: 20260217_credits_v35_justice
-- ==========================================================
-- REGRA: Non-destructive. CREATE IF NOT EXISTS.
-- ==========================================================

-- ============================================
-- 1. CORRIGIR RPC: debit_credits (Start 1000 → 1500)
-- ============================================
CREATE OR REPLACE FUNCTION public.debit_credits(
    p_tenant_id UUID,
    p_user_id UUID,
    p_creditos INTEGER,
    p_acao TEXT,
    p_descricao TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_record public.tenant_credits%ROWTYPE;
    v_periodo DATE;
    v_saldo_disponivel INTEGER;
    v_novo_saldo INTEGER;
    v_plan_credits INTEGER;
    v_plan_name TEXT;
BEGIN
    v_periodo := date_trunc('month', CURRENT_DATE)::DATE;
    
    SELECT plan INTO v_plan_name FROM public.tenants WHERE id = p_tenant_id;
    
    -- ✅ CORRIGIDO: Start = 1500 (era 1000)
    v_plan_credits := CASE COALESCE(LOWER(v_plan_name), 'start')
        WHEN 'start' THEN 1500
        WHEN 'plus' THEN 12000
        WHEN 'pro' THEN 40000
        ELSE 1500
    END;
    
    INSERT INTO public.tenant_credits (tenant_id, user_id, periodo_mes, creditos_plano, plano_nome)
    VALUES (p_tenant_id, p_user_id, v_periodo, v_plan_credits, COALESCE(v_plan_name, 'start'))
    ON CONFLICT (tenant_id, periodo_mes) DO NOTHING;
    
    SELECT * INTO v_record 
    FROM public.tenant_credits 
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo
    FOR UPDATE;
    
    v_saldo_disponivel := (v_record.creditos_plano + v_record.creditos_bonus) - v_record.creditos_usados;
    v_novo_saldo := v_saldo_disponivel - p_creditos;
    
    UPDATE public.tenant_credits 
    SET creditos_usados = creditos_usados + p_creditos,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo;
    
    INSERT INTO public.credit_transactions 
        (tenant_id, user_id, tipo, creditos, saldo_apos, acao, descricao, metadata)
    VALUES 
        (p_tenant_id, p_user_id, 'debit', -p_creditos, v_novo_saldo, p_acao, 
         COALESCE(p_descricao, p_acao), p_metadata);
    
    RETURN jsonb_build_object(
        'success', true,
        'saldo_restante', v_novo_saldo,
        'creditos_debitados', p_creditos,
        'total_disponivel', v_record.creditos_plano + v_record.creditos_bonus,
        'total_usado', v_record.creditos_usados + p_creditos,
        'excedente', CASE WHEN v_novo_saldo < 0 THEN true ELSE false END,
        'percentual_uso', ROUND(((v_record.creditos_usados + p_creditos)::NUMERIC / 
            GREATEST((v_record.creditos_plano + v_record.creditos_bonus), 1)) * 100, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CORRIGIR RPC: get_credit_balance (Start 1000 → 1500)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_credit_balance(
    p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_record public.tenant_credits%ROWTYPE;
    v_periodo DATE;
    v_plan_credits INTEGER;
    v_plan_name TEXT;
BEGIN
    v_periodo := date_trunc('month', CURRENT_DATE)::DATE;
    
    SELECT plan INTO v_plan_name FROM public.tenants WHERE id = p_tenant_id;
    
    -- ✅ CORRIGIDO: Start = 1500 (era 1000)
    v_plan_credits := CASE COALESCE(LOWER(v_plan_name), 'start')
        WHEN 'start' THEN 1500
        WHEN 'plus' THEN 12000
        WHEN 'pro' THEN 40000
        ELSE 1500
    END;
    
    INSERT INTO public.tenant_credits (tenant_id, user_id, periodo_mes, creditos_plano, plano_nome)
    VALUES (p_tenant_id, COALESCE(
        (SELECT owner_user_id FROM public.tenants WHERE id = p_tenant_id),
        '00000000-0000-0000-0000-000000000000'::UUID
    ), v_periodo, v_plan_credits, COALESCE(v_plan_name, 'start'))
    ON CONFLICT (tenant_id, periodo_mes) DO NOTHING;
    
    SELECT * INTO v_record 
    FROM public.tenant_credits 
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo;
    
    IF v_record IS NULL THEN
        RETURN jsonb_build_object(
            'creditos_totais', v_plan_credits,
            'creditos_usados', 0,
            'creditos_bonus', 0,
            'creditos_restantes', v_plan_credits,
            'percentual_uso', 0,
            'plano', COALESCE(v_plan_name, 'start'),
            'periodo', v_periodo
        );
    END IF;
    
    RETURN jsonb_build_object(
        'creditos_totais', v_record.creditos_plano + v_record.creditos_bonus,
        'creditos_plano', v_record.creditos_plano,
        'creditos_usados', v_record.creditos_usados,
        'creditos_bonus', v_record.creditos_bonus,
        'creditos_restantes', (v_record.creditos_plano + v_record.creditos_bonus) - v_record.creditos_usados,
        'percentual_uso', ROUND((v_record.creditos_usados::NUMERIC / 
            GREATEST((v_record.creditos_plano + v_record.creditos_bonus), 1)) * 100, 1),
        'plano', v_record.plano_nome,
        'periodo', v_record.periodo_mes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. TABELA: number_subscriptions (Add-ons Stripe)
-- ============================================
CREATE TABLE IF NOT EXISTS public.number_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    country_code TEXT NOT NULL,              -- 'PT', 'BR', 'ES', 'US'
    phone_number TEXT,                       -- E.164 format
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.number_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "number_subscriptions_policy" ON public.number_subscriptions;
CREATE POLICY "number_subscriptions_policy" ON public.number_subscriptions
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id() OR 
        public.is_admin(auth.uid())
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_number_subs_tenant 
    ON public.number_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_number_subs_stripe 
    ON public.number_subscriptions(stripe_subscription_id);

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_number_subscriptions_updated_at') THEN
        CREATE TRIGGER update_number_subscriptions_updated_at
        BEFORE UPDATE ON public.number_subscriptions
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 4. ATUALIZAR tenant_credits existentes (Start → 1500)
-- ============================================
UPDATE public.tenant_credits 
SET creditos_plano = 1500 
WHERE plano_nome = 'start' 
  AND creditos_plano = 1000
  AND periodo_mes = date_trunc('month', CURRENT_DATE)::DATE;

-- ============================================
-- FIM DA MIGRATION: CREDITS v3.5
-- ============================================
