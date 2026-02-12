-- ==========================================================
-- CREDITS SYSTEM - Sistema de Créditos LIA
-- Tabelas, RPCs e Políticas para gestão de créditos
-- ==========================================================
-- REGRA: Non-destructive. Usar CREATE IF NOT EXISTS.
-- ==========================================================

-- ============================================
-- 1. TABELA: tenant_credits (Saldo mensal)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    periodo_mes DATE NOT NULL,              -- Primeiro dia do mês: '2026-02-01'
    creditos_plano INTEGER NOT NULL,        -- Créditos base do plano
    creditos_bonus INTEGER DEFAULT 0,       -- Créditos de recarga comprados
    creditos_usados INTEGER DEFAULT 0,      -- Consumidos no mês
    plano_nome TEXT NOT NULL,               -- 'Start', 'Plus', 'Pro'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, periodo_mes)
);

-- ============================================
-- 2. TABELA: credit_transactions (Log de débitos/créditos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('debit', 'credit', 'recharge', 'plan_reset', 'rollover', 'referral')),
    creditos INTEGER NOT NULL,              -- Negativo = débito, Positivo = crédito
    saldo_apos INTEGER NOT NULL,            -- Saldo restante após esta transação
    acao TEXT NOT NULL,                      -- 'message', 'voice_min', 'marketing', 'stt', 'doc_analysis', 'scheduling', 'recharge', 'plan_reset'
    descricao TEXT,                          -- Descrição legível
    metadata JSONB DEFAULT '{}',            -- { model, tokens, conversation_id, package_id, etc. }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. TABELA: credit_packages (Pacotes de recarga)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    creditos INTEGER NOT NULL,
    preco_eur NUMERIC(10,2) NOT NULL,
    stripe_price_id TEXT,                    -- ID do preço no Stripe
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,                 -- Ordem de exibição
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. ATIVAR RLS
-- ============================================
ALTER TABLE public.tenant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS RLS
-- ============================================

-- tenant_credits: Isolamento por tenant
DROP POLICY IF EXISTS "tenant_credits_policy" ON public.tenant_credits;
CREATE POLICY "tenant_credits_policy" ON public.tenant_credits
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id() OR 
        public.is_admin(auth.uid())
    );

-- credit_transactions: Isolamento por tenant
DROP POLICY IF EXISTS "credit_transactions_policy" ON public.credit_transactions;
CREATE POLICY "credit_transactions_policy" ON public.credit_transactions
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id() OR 
        public.is_admin(auth.uid())
    );

-- credit_packages: Leitura pública, escrita admin
DROP POLICY IF EXISTS "credit_packages_read" ON public.credit_packages;
CREATE POLICY "credit_packages_read" ON public.credit_packages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "credit_packages_write" ON public.credit_packages;
CREATE POLICY "credit_packages_write" ON public.credit_packages
    FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- 6. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenant_credits_lookup 
    ON public.tenant_credits(tenant_id, periodo_mes DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant 
    ON public.credit_transactions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type 
    ON public.credit_transactions(tenant_id, acao);

CREATE INDEX IF NOT EXISTS idx_credit_packages_active 
    ON public.credit_packages(ativo, ordem);

-- ============================================
-- 7. TRIGGERS updated_at
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_credits_updated_at') THEN
        CREATE TRIGGER update_tenant_credits_updated_at
        BEFORE UPDATE ON public.tenant_credits
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_credit_packages_updated_at') THEN
        CREATE TRIGGER update_credit_packages_updated_at
        BEFORE UPDATE ON public.credit_packages
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 8. RPC: debit_credits (Débito atômico)
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
    -- Determinar período atual (primeiro dia do mês)
    v_periodo := date_trunc('month', CURRENT_DATE)::DATE;
    
    -- Obter plano atual do tenant
    SELECT plan INTO v_plan_name FROM public.tenants WHERE id = p_tenant_id;
    
    -- Determinar créditos do plano
    v_plan_credits := CASE COALESCE(LOWER(v_plan_name), 'start')
        WHEN 'start' THEN 1000
        WHEN 'plus' THEN 12000
        WHEN 'pro' THEN 40000
        ELSE 1000
    END;
    
    -- Garantir que existe registro do mês atual (upsert)
    INSERT INTO public.tenant_credits (tenant_id, user_id, periodo_mes, creditos_plano, plano_nome)
    VALUES (p_tenant_id, p_user_id, v_periodo, v_plan_credits, COALESCE(v_plan_name, 'start'))
    ON CONFLICT (tenant_id, periodo_mes) DO NOTHING;
    
    -- Lock da linha para concorrência segura
    SELECT * INTO v_record 
    FROM public.tenant_credits 
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo
    FOR UPDATE;
    
    -- Calcular saldo disponível
    v_saldo_disponivel := (v_record.creditos_plano + v_record.creditos_bonus) - v_record.creditos_usados;
    
    -- Verificar se há créditos suficientes (soft limit — debita mesmo se negativo para não bloquear)
    -- O sistema de alertas cuida de notificar sobre excedente
    v_novo_saldo := v_saldo_disponivel - p_creditos;
    
    -- Debitar
    UPDATE public.tenant_credits 
    SET creditos_usados = creditos_usados + p_creditos,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo;
    
    -- Registrar transação
    INSERT INTO public.credit_transactions 
        (tenant_id, user_id, tipo, creditos, saldo_apos, acao, descricao, metadata)
    VALUES 
        (p_tenant_id, p_user_id, 'debit', -p_creditos, v_novo_saldo, p_acao, 
         COALESCE(p_descricao, p_acao), p_metadata);
    
    -- Retornar resultado
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
-- 9. RPC: get_credit_balance (Consultar saldo)
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
    
    -- Obter plano do tenant
    SELECT plan INTO v_plan_name FROM public.tenants WHERE id = p_tenant_id;
    
    v_plan_credits := CASE COALESCE(LOWER(v_plan_name), 'start')
        WHEN 'start' THEN 1000
        WHEN 'plus' THEN 12000
        WHEN 'pro' THEN 40000
        ELSE 1000
    END;
    
    -- Garantir que existe registro
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
-- 10. RPC: add_recharge_credits (Adicionar recarga)
-- ============================================
CREATE OR REPLACE FUNCTION public.add_recharge_credits(
    p_tenant_id UUID,
    p_user_id UUID,
    p_creditos INTEGER,
    p_package_name TEXT DEFAULT 'Recarga Manual',
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_record public.tenant_credits%ROWTYPE;
    v_periodo DATE;
    v_novo_total INTEGER;
BEGIN
    v_periodo := date_trunc('month', CURRENT_DATE)::DATE;
    
    -- Lock da linha
    SELECT * INTO v_record 
    FROM public.tenant_credits 
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo
    FOR UPDATE;
    
    IF v_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum registro de créditos para este mês');
    END IF;
    
    -- Adicionar créditos bonus
    UPDATE public.tenant_credits 
    SET creditos_bonus = creditos_bonus + p_creditos,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND periodo_mes = v_periodo;
    
    v_novo_total := (v_record.creditos_plano + v_record.creditos_bonus + p_creditos) - v_record.creditos_usados;
    
    -- Registrar transação
    INSERT INTO public.credit_transactions 
        (tenant_id, user_id, tipo, creditos, saldo_apos, acao, descricao, metadata)
    VALUES 
        (p_tenant_id, p_user_id, 'recharge', p_creditos, v_novo_total, 'recharge', 
         p_package_name, p_metadata);
    
    RETURN jsonb_build_object(
        'success', true,
        'creditos_adicionados', p_creditos,
        'novo_saldo', v_novo_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. SEED: Pacotes de recarga
-- ============================================
INSERT INTO public.credit_packages (nome, descricao, creditos, preco_eur, ordem) VALUES
    ('Recarga Básica', '400 créditos — ideal para picos de uso', 400, 9.00, 1),
    ('Recarga Smart', '1.500 créditos — melhor custo-benefício', 1500, 29.00, 2),
    ('Recarga Turbo', '3.500 créditos — para campanhas e eventos', 3500, 59.00, 3),
    ('Recarga Business', '10.000 créditos — para operações intensivas', 10000, 149.00, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIM DA MIGRATION: CREDITS SYSTEM
-- ============================================
