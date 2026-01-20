-- ============================================
-- Daily Decision Brief System
-- Fase 1: MVP
-- ============================================

-- 1. Templates de Briefing por Segmento
CREATE TABLE IF NOT EXISTS public.brief_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_key TEXT NOT NULL UNIQUE, -- 'ecommerce', 'services', 'saas'
    name TEXT NOT NULL,
    description TEXT,
    metrics JSONB NOT NULL DEFAULT '[]', -- Lista de métricas do template
    prompt_template TEXT, -- Template para geração de insights via IA
    message_template TEXT, -- Template da mensagem WhatsApp
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Métricas Unificadas (Camada de Métricas)
CREATE TABLE IF NOT EXISTS public.metrics_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL, -- 'orders', 'revenue', 'cac', 'roas', etc.
    metric_value NUMERIC NOT NULL,
    metric_date DATE NOT NULL,
    source TEXT NOT NULL, -- 'supabase', 'stripe', 'meta_ads', etc.
    dimensions JSONB DEFAULT '{}', -- Dimensões adicionais (categoria, canal, etc.)
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_metric_tenant_date UNIQUE (tenant_id, metric_key, metric_date, source)
);

CREATE INDEX idx_metrics_tenant_date ON public.metrics_unified(tenant_id, metric_date DESC);
CREATE INDEX idx_metrics_key ON public.metrics_unified(metric_key);

-- 3. Agendamentos de Briefing
CREATE TABLE IF NOT EXISTS public.brief_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.brief_templates(id),
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'realtime')),
    delivery_time TIME NOT NULL DEFAULT '08:00',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    delivery_channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'slack'
    recipient TEXT NOT NULL, -- Número de telefone, email, etc.
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}', -- Configurações adicionais
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedules_next_run ON public.brief_schedules(next_run_at) WHERE is_active = true;

-- 4. Histórico de Briefings Enviados
CREATE TABLE IF NOT EXISTS public.brief_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.brief_schedules(id),
    template_id UUID REFERENCES public.brief_templates(id),
    brief_type TEXT NOT NULL, -- 'daily', 'weekly', 'alert'
    content JSONB NOT NULL, -- Conteúdo estruturado do briefing
    message_sent TEXT, -- Mensagem enviada
    delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    delivery_channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    metrics_snapshot JSONB, -- Snapshot das métricas usadas
    anomalies_detected JSONB DEFAULT '[]', -- Anomalias detectadas
    actions_suggested JSONB DEFAULT '[]', -- Ações sugeridas
    sources_used JSONB DEFAULT '[]', -- Fontes de dados usadas
    confidence_level TEXT DEFAULT 'high', -- 'high', 'medium', 'low'
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_history_tenant ON public.brief_history(tenant_id, created_at DESC);

-- 5. Regras de Detecção de Anomalias
CREATE TABLE IF NOT EXISTS public.anomaly_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = regra global
    metric_key TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold', 'percent_change', 'zscore')),
    rule_config JSONB NOT NULL, -- Configuração da regra
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Exemplo de rule_config:
-- threshold: {"operator": ">", "value": 100}
-- percent_change: {"operator": "<", "value": -20, "compare_period": "7d"}
-- zscore: {"threshold": 2}

-- 6. Perguntas/Interações do Chat (Para "Pergunte ao Dado")
CREATE TABLE IF NOT EXISTS public.brief_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_phone TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    query_executed TEXT, -- SQL/consulta executada
    sources_used JSONB DEFAULT '[]',
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interactions_tenant ON public.brief_interactions(tenant_id, created_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.metrics_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_interactions ENABLE ROW LEVEL SECURITY;

-- Policies para metrics_unified
CREATE POLICY "Tenants can view own metrics"
    ON public.metrics_unified FOR SELECT
    USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage metrics"
    ON public.metrics_unified FOR ALL
    USING (auth.role() = 'service_role');

-- Policies para brief_schedules
CREATE POLICY "Tenants can manage own schedules"
    ON public.brief_schedules FOR ALL
    USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()
    ));

-- Policies para brief_history
CREATE POLICY "Tenants can view own history"
    ON public.brief_history FOR SELECT
    USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()
    ));

-- ============================================
-- Seed: Templates por Segmento
-- ============================================

INSERT INTO public.brief_templates (segment_key, name, description, metrics, prompt_template, message_template)
VALUES 
-- E-commerce
('ecommerce', 'E-commerce Daily Brief', 'Template para lojas virtuais e marketplaces', 
 '[
    {"key": "orders", "name": "Pedidos", "type": "count", "priority": 1},
    {"key": "revenue", "name": "Faturamento", "type": "currency", "priority": 1},
    {"key": "avg_ticket", "name": "Ticket Médio", "type": "currency", "priority": 2},
    {"key": "cac", "name": "CAC", "type": "currency", "priority": 2},
    {"key": "roas", "name": "ROAS", "type": "ratio", "priority": 1},
    {"key": "conversion_rate", "name": "Taxa de Conversão", "type": "percent", "priority": 1},
    {"key": "cart_abandonment", "name": "Abandono de Carrinho", "type": "percent", "priority": 2},
    {"key": "returns", "name": "Devoluções", "type": "count", "priority": 3},
    {"key": "stock_rupture", "name": "Ruptura de Estoque", "type": "count", "priority": 2},
    {"key": "sessions", "name": "Sessões", "type": "count", "priority": 3}
 ]'::jsonb,
 'Você é um analista de e-commerce. Analise os dados e gere um briefing executivo focado em: vendas, conversão, marketing pago e estoque.',
 '📊 *Briefing {{date}}*

*Resumo:*
{{summary}}

⚠️ *Atenção:*
{{alerts}}

🔍 *Causas prováveis:*
{{causes}}

✅ *Ações:*
{{actions}}

💬 Pergunte: "detalhar" | "top produtos" | "comparar"
📎 {{sources}} | {{confidence}}'
),

-- Serviços
('services', 'Serviços Daily Brief', 'Template para prestadores de serviços e consultorias',
 '[
    {"key": "leads", "name": "Leads", "type": "count", "priority": 1},
    {"key": "proposals", "name": "Propostas", "type": "count", "priority": 1},
    {"key": "conversion_rate", "name": "Taxa de Conversão", "type": "percent", "priority": 1},
    {"key": "appointments", "name": "Agendamentos", "type": "count", "priority": 1},
    {"key": "no_show", "name": "No-Show", "type": "percent", "priority": 2},
    {"key": "revenue", "name": "Faturamento", "type": "currency", "priority": 1},
    {"key": "margin", "name": "Margem", "type": "percent", "priority": 2},
    {"key": "avg_deal_value", "name": "Valor Médio", "type": "currency", "priority": 2},
    {"key": "response_time", "name": "Tempo de Resposta", "type": "duration", "priority": 3},
    {"key": "satisfaction", "name": "Satisfação", "type": "score", "priority": 3}
 ]'::jsonb,
 'Você é um analista de negócios de serviços. Analise os dados focando em: captação, conversão, agendamentos e margem.',
 '📊 *Briefing {{date}}*

*Resumo:*
{{summary}}

⚠️ *Atenção:*
{{alerts}}

🔍 *Causas prováveis:*
{{causes}}

✅ *Ações:*
{{actions}}

💬 Pergunte: "detalhar leads" | "pipeline" | "no-shows"
📎 {{sources}} | {{confidence}}'
),

-- SaaS
('saas', 'SaaS Daily Brief', 'Template para empresas de software e assinaturas',
 '[
    {"key": "mrr", "name": "MRR", "type": "currency", "priority": 1},
    {"key": "arr", "name": "ARR", "type": "currency", "priority": 2},
    {"key": "churn_rate", "name": "Churn Rate", "type": "percent", "priority": 1},
    {"key": "expansion_mrr", "name": "Expansão MRR", "type": "currency", "priority": 2},
    {"key": "new_mrr", "name": "Novo MRR", "type": "currency", "priority": 1},
    {"key": "activation_rate", "name": "Taxa de Ativação", "type": "percent", "priority": 1},
    {"key": "trial_conversion", "name": "Conversão Trial", "type": "percent", "priority": 2},
    {"key": "support_tickets", "name": "Tickets Suporte", "type": "count", "priority": 2},
    {"key": "nps", "name": "NPS", "type": "score", "priority": 3},
    {"key": "dau_mau", "name": "DAU/MAU", "type": "ratio", "priority": 3}
 ]'::jsonb,
 'Você é um analista de SaaS. Analise os dados focando em: MRR, churn, ativação e expansão.',
 '📊 *Briefing {{date}}*

*Resumo:*
{{summary}}

⚠️ *Atenção:*
{{alerts}}

🔍 *Causas prováveis:*
{{causes}}

✅ *Ações:*
{{actions}}

💬 Pergunte: "detalhar churn" | "cohort" | "ltv"
📎 {{sources}} | {{confidence}}'
)
ON CONFLICT (segment_key) DO UPDATE SET
    metrics = EXCLUDED.metrics,
    prompt_template = EXCLUDED.prompt_template,
    message_template = EXCLUDED.message_template,
    updated_at = now();

-- ============================================
-- Regras de Anomalia Padrão
-- ============================================

INSERT INTO public.anomaly_rules (tenant_id, metric_key, rule_type, rule_config, severity)
VALUES
-- Regras globais (tenant_id = NULL)
(NULL, 'revenue', 'percent_change', '{"operator": "<", "value": -15, "compare_period": "7d"}', 'warning'),
(NULL, 'revenue', 'percent_change', '{"operator": "<", "value": -30, "compare_period": "7d"}', 'critical'),
(NULL, 'conversion_rate', 'percent_change', '{"operator": "<", "value": -20, "compare_period": "7d"}', 'warning'),
(NULL, 'churn_rate', 'threshold', '{"operator": ">", "value": 5}', 'critical'),
(NULL, 'roas', 'threshold', '{"operator": "<", "value": 1.2}', 'warning'),
(NULL, 'cart_abandonment', 'threshold', '{"operator": ">", "value": 75}', 'warning'),
(NULL, 'no_show', 'threshold', '{"operator": ">", "value": 20}', 'warning')
ON CONFLICT DO NOTHING;

-- ============================================
-- Functions
-- ============================================

-- Função para obter métricas agregadas
CREATE OR REPLACE FUNCTION public.rpc_get_metrics_summary(
    p_tenant_id UUID,
    p_metric_keys TEXT[],
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    metric_key TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_percent NUMERIC,
    trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_period_days INTEGER;
BEGIN
    v_period_days := p_end_date - p_start_date;
    
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            m.metric_key,
            SUM(m.metric_value) as total
        FROM public.metrics_unified m
        WHERE m.tenant_id = p_tenant_id
          AND m.metric_key = ANY(p_metric_keys)
          AND m.metric_date BETWEEN p_start_date AND p_end_date
        GROUP BY m.metric_key
    ),
    previous_period AS (
        SELECT 
            m.metric_key,
            SUM(m.metric_value) as total
        FROM public.metrics_unified m
        WHERE m.tenant_id = p_tenant_id
          AND m.metric_key = ANY(p_metric_keys)
          AND m.metric_date BETWEEN (p_start_date - v_period_days) AND (p_start_date - 1)
        GROUP BY m.metric_key
    )
    SELECT 
        c.metric_key,
        COALESCE(c.total, 0) as current_value,
        COALESCE(p.total, 0) as previous_value,
        CASE 
            WHEN COALESCE(p.total, 0) = 0 THEN 0
            ELSE ROUND(((c.total - p.total) / p.total) * 100, 2)
        END as change_percent,
        CASE 
            WHEN COALESCE(c.total, 0) > COALESCE(p.total, 0) THEN 'up'
            WHEN COALESCE(c.total, 0) < COALESCE(p.total, 0) THEN 'down'
            ELSE 'stable'
        END as trend
    FROM current_period c
    LEFT JOIN previous_period p ON c.metric_key = p.metric_key;
END;
$$;

-- Função para detectar anomalias
CREATE OR REPLACE FUNCTION public.rpc_detect_anomalies(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    metric_key TEXT,
    current_value NUMERIC,
    threshold_value NUMERIC,
    severity TEXT,
    rule_type TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT 
            m.metric_key,
            m.metric_value as current_value,
            AVG(m.metric_value) OVER (
                PARTITION BY m.metric_key 
                ORDER BY m.metric_date 
                ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
            ) as avg_7d,
            STDDEV(m.metric_value) OVER (
                PARTITION BY m.metric_key 
                ORDER BY m.metric_date 
                ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
            ) as stddev_7d
        FROM public.metrics_unified m
        WHERE m.tenant_id = p_tenant_id
          AND m.metric_date <= p_date
          AND m.metric_date >= p_date - INTERVAL '8 days'
    ),
    latest AS (
        SELECT DISTINCT ON (metric_key) *
        FROM recent_metrics
        ORDER BY metric_key, current_value DESC
    )
    SELECT 
        l.metric_key,
        l.current_value,
        COALESCE(l.avg_7d, 0) as threshold_value,
        r.severity,
        r.rule_type,
        CASE r.rule_type
            WHEN 'threshold' THEN 
                l.metric_key || ' está ' || 
                CASE WHEN (r.rule_config->>'operator') = '>' THEN 'acima' ELSE 'abaixo' END ||
                ' do limite (' || (r.rule_config->>'value') || ')'
            WHEN 'percent_change' THEN
                l.metric_key || ' caiu ' || 
                ROUND(((l.current_value - l.avg_7d) / NULLIF(l.avg_7d, 0)) * 100, 1) || 
                '% vs média 7d'
            WHEN 'zscore' THEN
                l.metric_key || ' apresenta variação anormal'
            ELSE 'Anomalia detectada em ' || l.metric_key
        END as message
    FROM latest l
    JOIN public.anomaly_rules r ON (r.metric_key = l.metric_key OR r.metric_key = '*')
    WHERE r.is_active = true
      AND (r.tenant_id IS NULL OR r.tenant_id = p_tenant_id)
      AND (
        (r.rule_type = 'threshold' AND (
            ((r.rule_config->>'operator') = '>' AND l.current_value > (r.rule_config->>'value')::NUMERIC) OR
            ((r.rule_config->>'operator') = '<' AND l.current_value < (r.rule_config->>'value')::NUMERIC)
        ))
        OR
        (r.rule_type = 'percent_change' AND l.avg_7d > 0 AND (
            ((l.current_value - l.avg_7d) / l.avg_7d * 100) < (r.rule_config->>'value')::NUMERIC
        ))
        OR
        (r.rule_type = 'zscore' AND l.stddev_7d > 0 AND (
            ABS(l.current_value - l.avg_7d) / l.stddev_7d > (r.rule_config->>'threshold')::NUMERIC
        ))
      );
END;
$$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brief_templates_updated_at
    BEFORE UPDATE ON public.brief_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brief_schedules_updated_at
    BEFORE UPDATE ON public.brief_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
