-- ==========================================================
-- DASHBOARD ENGINE MVP - MIGRATION 002
-- RPC Functions para Métricas
-- ==========================================================
-- Funções otimizadas para consultas de métricas com cache
-- ==========================================================

-- ============================================
-- 1. FUNÇÃO: rpc_metric_timeseries
-- Retorna série temporal de uma métrica
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_metric_timeseries(
    p_tenant_id uuid,
    p_metric_key text,
    p_start_date date,
    p_end_date date,
    p_group_by text DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
    period text,
    period_start date,
    period_end date,
    value numeric,
    previous_value numeric,
    change_percent numeric
) AS $$
DECLARE
    date_trunc_unit text;
BEGIN
    -- Determinar truncagem de data
    date_trunc_unit := CASE p_group_by
        WHEN 'week' THEN 'week'
        WHEN 'month' THEN 'month'
        ELSE 'day'
    END;
    
    -- Primeiro tenta buscar do cache
    RETURN QUERY
    WITH cached_data AS (
        SELECT 
            date_trunc(date_trunc_unit, c.date)::date as period_date,
            SUM(c.value) as cached_value
        FROM public.analytics_cache_daily c
        WHERE c.tenant_id = p_tenant_id
          AND c.metric_key = p_metric_key
          AND c.date BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc(date_trunc_unit, c.date)
    ),
    -- Fallback para cálculo direto se cache vazio
    calculated_data AS (
        SELECT 
            date_trunc(date_trunc_unit, t.date)::date as period_date,
            CASE p_metric_key
                WHEN 'cash_in' THEN SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE 0 END)
                WHEN 'cash_out' THEN SUM(CASE WHEN t.type = 'out' THEN t.amount ELSE 0 END)
                WHEN 'net_cash' THEN SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE -t.amount END)
                WHEN 'transaction_count' THEN COUNT(*)::numeric
                ELSE SUM(t.amount)
            END as calc_value
        FROM public.transactions t
        WHERE t.tenant_id = p_tenant_id
          AND t.date BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc(date_trunc_unit, t.date)
    ),
    -- Combina cache com fallback
    combined AS (
        SELECT 
            COALESCE(cd.period_date, calc.period_date) as period_date,
            COALESCE(cd.cached_value, calc.calc_value, 0) as value
        FROM cached_data cd
        FULL OUTER JOIN calculated_data calc ON cd.period_date = calc.period_date
    ),
    -- Adiciona período anterior para comparação
    with_previous AS (
        SELECT 
            c.period_date,
            c.value,
            LAG(c.value) OVER (ORDER BY c.period_date) as prev_value
        FROM combined c
        ORDER BY c.period_date
    )
    SELECT 
        to_char(wp.period_date, 'YYYY-MM-DD') as period,
        wp.period_date as period_start,
        (wp.period_date + CASE date_trunc_unit
            WHEN 'week' THEN interval '6 days'
            WHEN 'month' THEN interval '1 month - 1 day'
            ELSE interval '0 days'
        END)::date as period_end,
        COALESCE(wp.value, 0) as value,
        COALESCE(wp.prev_value, 0) as previous_value,
        CASE 
            WHEN COALESCE(wp.prev_value, 0) = 0 THEN 0
            ELSE ROUND(((wp.value - wp.prev_value) / wp.prev_value * 100), 2)
        END as change_percent
    FROM with_previous wp
    ORDER BY wp.period_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 2. FUNÇÃO: rpc_metric_breakdown
-- Retorna breakdown de uma métrica por dimensão
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_metric_breakdown(
    p_tenant_id uuid,
    p_metric_key text,
    p_start_date date,
    p_end_date date,
    p_dimension text DEFAULT 'category', -- 'category', 'payment_method', 'type'
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    dimension_value text,
    value numeric,
    percentage numeric,
    count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH breakdown AS (
        SELECT 
            CASE p_dimension
                WHEN 'category' THEN COALESCE(t.category, 'Sem categoria')
                WHEN 'payment_method' THEN COALESCE(t.payment_method, 'Não informado')
                WHEN 'type' THEN t.type
                ELSE COALESCE(t.category, 'Outros')
            END as dim_value,
            CASE p_metric_key
                WHEN 'cash_in' THEN SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE 0 END)
                WHEN 'cash_out' THEN SUM(CASE WHEN t.type = 'out' THEN t.amount ELSE 0 END)
                WHEN 'expenses_by_category' THEN SUM(CASE WHEN t.type = 'out' THEN t.amount ELSE 0 END)
                WHEN 'revenue_by_category' THEN SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE 0 END)
                ELSE SUM(t.amount)
            END as total_value,
            COUNT(*) as total_count
        FROM public.transactions t
        WHERE t.tenant_id = p_tenant_id
          AND t.date BETWEEN p_start_date AND p_end_date
          AND CASE p_metric_key
              WHEN 'cash_in' THEN t.type = 'in'
              WHEN 'cash_out' THEN t.type = 'out'
              WHEN 'expenses_by_category' THEN t.type = 'out'
              WHEN 'revenue_by_category' THEN t.type = 'in'
              ELSE TRUE
          END
        GROUP BY dim_value
    ),
    total AS (
        SELECT SUM(total_value) as grand_total FROM breakdown
    )
    SELECT 
        b.dim_value as dimension_value,
        COALESCE(b.total_value, 0) as value,
        CASE 
            WHEN t.grand_total = 0 OR t.grand_total IS NULL THEN 0
            ELSE ROUND((b.total_value / t.grand_total * 100), 2)
        END as percentage,
        b.total_count as count
    FROM breakdown b
    CROSS JOIN total t
    ORDER BY b.total_value DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. FUNÇÃO: rpc_table_recent
-- Retorna registros recentes de uma entidade
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_table_recent(
    p_tenant_id uuid,
    p_entity_type text,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    data jsonb,
    created_at timestamptz
) AS $$
BEGIN
    CASE p_entity_type
        WHEN 'transactions' THEN
            RETURN QUERY
            SELECT 
                t.id,
                jsonb_build_object(
                    'date', t.date,
                    'description', t.description,
                    'type', t.type,
                    'category', t.category,
                    'amount', t.amount,
                    'payment_method', t.payment_method
                ) as data,
                t.created_at
            FROM public.transactions t
            WHERE t.tenant_id = p_tenant_id
              AND (p_start_date IS NULL OR t.date >= p_start_date)
              AND (p_end_date IS NULL OR t.date <= p_end_date)
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        WHEN 'invoices' THEN
            RETURN QUERY
            SELECT 
                i.id,
                jsonb_build_object(
                    'invoice_number', i.invoice_number,
                    'customer_name', i.customer_name,
                    'issued_at', i.issued_at,
                    'due_at', i.due_at,
                    'status', i.status,
                    'total_amount', i.total_amount
                ) as data,
                i.created_at
            FROM public.invoices i
            WHERE i.tenant_id = p_tenant_id
              AND (p_start_date IS NULL OR i.issued_at >= p_start_date)
              AND (p_end_date IS NULL OR i.issued_at <= p_end_date)
            ORDER BY i.issued_at DESC, i.created_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        WHEN 'deals' THEN
            RETURN QUERY
            SELECT 
                d.id,
                jsonb_build_object(
                    'title', d.title,
                    'stage', d.stage,
                    'amount', d.amount,
                    'probability', d.probability,
                    'contact_name', d.contact_name,
                    'expected_close_date', d.expected_close_date
                ) as data,
                d.created_at
            FROM public.deals d
            WHERE d.tenant_id = p_tenant_id
            ORDER BY d.created_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        WHEN 'contacts' THEN
            RETURN QUERY
            SELECT 
                c.id,
                jsonb_build_object(
                    'name', c.name,
                    'email', c.email,
                    'phone', c.phone,
                    'company', c.company,
                    'type', c.type
                ) as data,
                c.created_at
            FROM public.contacts c
            WHERE c.tenant_id = p_tenant_id
            ORDER BY c.created_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        ELSE
            -- Fallback vazio
            RETURN;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. FUNÇÃO: rpc_deals_funnel
-- Retorna dados do funil de vendas
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_deals_funnel(
    p_tenant_id uuid
)
RETURNS TABLE (
    stage text,
    stage_order integer,
    count bigint,
    total_value numeric,
    avg_probability numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH stage_order AS (
        SELECT unnest(ARRAY['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost']) as stage_name,
               generate_series(1, 6) as stage_ord
    )
    SELECT 
        so.stage_name as stage,
        so.stage_ord as stage_order,
        COALESCE(COUNT(d.id), 0) as count,
        COALESCE(SUM(d.amount), 0) as total_value,
        COALESCE(AVG(d.probability), 0) as avg_probability
    FROM stage_order so
    LEFT JOIN public.deals d ON d.stage = so.stage_name AND d.tenant_id = p_tenant_id
    GROUP BY so.stage_name, so.stage_ord
    ORDER BY so.stage_ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 5. FUNÇÃO: rpc_kpi_summary
-- Retorna resumo de KPIs principais
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_kpi_summary(
    p_tenant_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    metric_key text,
    current_value numeric,
    previous_value numeric,
    change_percent numeric,
    trend text
) AS $$
DECLARE
    period_days integer;
    prev_start date;
    prev_end date;
BEGIN
    period_days := p_end_date - p_start_date + 1;
    prev_end := p_start_date - 1;
    prev_start := prev_end - period_days + 1;
    
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            'cash_in' as metric,
            SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as val
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT 
            'cash_out',
            SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END)
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT 
            'net_cash',
            SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END)
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT 
            'transaction_count',
            COUNT(*)::numeric
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT 
            'deals_count',
            COUNT(*)::numeric
        FROM public.deals
        WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT 
            'deals_value',
            SUM(COALESCE(amount, 0))
        FROM public.deals
        WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date
    ),
    previous_period AS (
        SELECT 
            'cash_in' as metric,
            SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as val
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN prev_start AND prev_end
        UNION ALL
        SELECT 
            'cash_out',
            SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END)
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN prev_start AND prev_end
        UNION ALL
        SELECT 
            'net_cash',
            SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END)
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN prev_start AND prev_end
        UNION ALL
        SELECT 
            'transaction_count',
            COUNT(*)::numeric
        FROM public.transactions
        WHERE tenant_id = p_tenant_id AND date BETWEEN prev_start AND prev_end
        UNION ALL
        SELECT 
            'deals_count',
            COUNT(*)::numeric
        FROM public.deals
        WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN prev_start AND prev_end
        UNION ALL
        SELECT 
            'deals_value',
            SUM(COALESCE(amount, 0))
        FROM public.deals
        WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN prev_start AND prev_end
    )
    SELECT 
        cp.metric as metric_key,
        COALESCE(cp.val, 0) as current_value,
        COALESCE(pp.val, 0) as previous_value,
        CASE 
            WHEN COALESCE(pp.val, 0) = 0 THEN 0
            ELSE ROUND(((COALESCE(cp.val, 0) - COALESCE(pp.val, 0)) / pp.val * 100), 2)
        END as change_percent,
        CASE 
            WHEN COALESCE(cp.val, 0) > COALESCE(pp.val, 0) THEN 'up'
            WHEN COALESCE(cp.val, 0) < COALESCE(pp.val, 0) THEN 'down'
            ELSE 'stable'
        END as trend
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.metric = pp.metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 6. FUNÇÃO: rpc_get_merged_dashboard_config
-- Retorna config do dashboard com herança aplicada
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_get_merged_dashboard_config(
    p_tenant_id uuid
)
RETURNS jsonb AS $$
DECLARE
    tenant_config jsonb;
    base_config jsonb;
    segment text;
    base_key text;
BEGIN
    -- Buscar dashboard ativo do tenant
    SELECT td.config_json, td.segment_key
    INTO tenant_config, segment
    FROM public.tenant_dashboards td
    WHERE td.tenant_id = p_tenant_id AND td.is_active = true
    LIMIT 1;
    
    -- Se não tem dashboard, retornar null
    IF tenant_config IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Buscar template do segmento para obter base
    SELECT dt.base_template_key
    INTO base_key
    FROM public.dashboard_templates dt
    WHERE dt.segment_key = segment;
    
    -- Se tem base, fazer merge
    IF base_key IS NOT NULL THEN
        SELECT dt.template_json
        INTO base_config
        FROM public.dashboard_templates dt
        WHERE dt.segment_key = base_key;
        
        -- Merge: tenant_config sobrescreve base_config
        RETURN base_config || tenant_config;
    END IF;
    
    -- Sem base, retornar config direto
    RETURN tenant_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FIM DA MIGRATION 002
-- ============================================
