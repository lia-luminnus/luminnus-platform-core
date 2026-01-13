-- ==========================================================
-- DASHBOARD ENGINE MVP - MIGRATION 003
-- Seeds: Templates, Widgets e Métricas
-- ==========================================================
-- 3 Templates-base + 12 Templates por segmento (herança)
-- 10 Widgets MVP
-- Métricas principais
-- ==========================================================

-- ============================================
-- 1. SEED: Widget Registry (10 widgets MVP)
-- ============================================
INSERT INTO public.widget_registry (widget_key, name, description, category, icon, default_config, supported_metrics, plan_min)
VALUES
    ('kpi_card', 'Cartão KPI', 'Exibe valor de métrica com delta vs período anterior', 'kpi', 'trending_up', 
     '{"showTrend": true, "showPrevious": true, "formatType": "currency"}',
     ARRAY['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'deals_count', 'deals_value', 'invoices_pending', 'contacts_count'],
     'start'),
    
    ('line_timeseries', 'Gráfico de Linha', 'Série temporal com linha ou área', 'chart', 'show_chart',
     '{"chartType": "line", "showArea": false, "showPoints": true, "smoothCurve": true}',
     ARRAY['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'revenue_by_category'],
     'start'),
    
    ('bar_grouped', 'Barras Agrupadas', 'Gráfico de barras por categoria ou canal', 'chart', 'bar_chart',
     '{"orientation": "vertical", "showLabels": true, "stacked": false}',
     ARRAY['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
     'start'),
    
    ('donut_breakdown', 'Donut Breakdown', 'Gráfico donut com breakdown por dimensão', 'chart', 'donut_large',
     '{"showLegend": true, "showPercentage": true, "innerRadius": 60}',
     ARRAY['expenses_by_category', 'revenue_by_category', 'deals_by_stage', 'contacts_by_type'],
     'start'),
    
    ('table_rank', 'Tabela Ranking', 'Top N itens ordenados por métrica', 'table', 'leaderboard',
     '{"limit": 5, "showRank": true, "showChange": false}',
     ARRAY['top_categories', 'top_customers', 'top_products'],
     'start'),
    
    ('table_transactions', 'Transações Recentes', 'Lista paginada de transações', 'table', 'receipt_long',
     '{"pageSize": 10, "showFilters": true, "columns": ["date", "description", "category", "amount"]}',
     ARRAY['transactions_recent'],
     'start'),
    
    ('funnel', 'Funil de Vendas', 'Visualização de pipeline/funil CRM', 'special', 'filter_alt',
     '{"showPercentages": true, "showValues": true, "colorScheme": "gradient"}',
     ARRAY['deals_funnel'],
     'plus'),
    
    ('gauge', 'Medidor de Meta', 'Gauge circular mostrando progresso vs meta', 'kpi', 'speed',
     '{"min": 0, "max": 100, "target": 80, "showTarget": true}',
     ARRAY['goal_progress', 'conversion_rate', 'satisfaction_score'],
     'start'),
    
    ('heatmap_calendar', 'Mapa de Calor', 'Calendário com intensidade por dia', 'chart', 'calendar_month',
     '{"colorScheme": "green", "showTooltip": true}',
     ARRAY['activity_by_day', 'transactions_by_day'],
     'plus'),
    
    ('alerts_list', 'Lista de Alertas', 'Insights e notificações importantes', 'special', 'notifications',
     '{"maxItems": 5, "showTimestamp": true, "groupByType": false}',
     ARRAY['insights', 'alerts', 'recommendations'],
     'start')
ON CONFLICT (widget_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_config = EXCLUDED.default_config,
    supported_metrics = EXCLUDED.supported_metrics;

-- ============================================
-- 2. SEED: Metric Registry (métricas principais)
-- ============================================
INSERT INTO public.metric_registry (metric_key, name, description, unit, default_aggregation, source_entities, dimensions_supported, rpc_function, plan_min)
VALUES
    ('cash_in', 'Entradas', 'Total de receitas/entradas no período', 'currency', 'sum', 
     ARRAY['transactions'], ARRAY['category', 'payment_method', 'date'], 'rpc_metric_timeseries', 'start'),
    
    ('cash_out', 'Saídas', 'Total de despesas/saídas no período', 'currency', 'sum',
     ARRAY['transactions'], ARRAY['category', 'payment_method', 'date'], 'rpc_metric_timeseries', 'start'),
    
    ('net_cash', 'Saldo Líquido', 'Diferença entre entradas e saídas', 'currency', 'sum',
     ARRAY['transactions'], ARRAY['date'], 'rpc_metric_timeseries', 'start'),
    
    ('transaction_count', 'Qtd. Transações', 'Número total de transações', 'count', 'count',
     ARRAY['transactions'], ARRAY['category', 'type', 'date'], 'rpc_metric_timeseries', 'start'),
    
    ('revenue_by_category', 'Receita por Categoria', 'Breakdown de receitas por categoria', 'currency', 'sum',
     ARRAY['transactions'], ARRAY['category'], 'rpc_metric_breakdown', 'start'),
    
    ('expenses_by_category', 'Despesas por Categoria', 'Breakdown de despesas por categoria', 'currency', 'sum',
     ARRAY['transactions'], ARRAY['category'], 'rpc_metric_breakdown', 'start'),
    
    ('transactions_recent', 'Transações Recentes', 'Lista das últimas transações', 'table', 'none',
     ARRAY['transactions'], ARRAY['date', 'category', 'type'], 'rpc_table_recent', 'start'),
    
    ('deals_funnel', 'Funil de Vendas', 'Pipeline de negócios por estágio', 'funnel', 'count',
     ARRAY['deals'], ARRAY['stage'], 'rpc_deals_funnel', 'plus'),
    
    ('deals_count', 'Qtd. Negócios', 'Total de oportunidades/negócios', 'count', 'count',
     ARRAY['deals'], ARRAY['stage', 'date'], NULL, 'start'),
    
    ('deals_value', 'Valor Pipeline', 'Valor total do pipeline de vendas', 'currency', 'sum',
     ARRAY['deals'], ARRAY['stage'], NULL, 'start'),
    
    ('contacts_count', 'Qtd. Contatos', 'Total de contatos cadastrados', 'count', 'count',
     ARRAY['contacts'], ARRAY['type'], NULL, 'start'),
    
    ('invoices_pending', 'Faturas Pendentes', 'Valor em faturas não pagas', 'currency', 'sum',
     ARRAY['invoices'], ARRAY['status'], NULL, 'start')
ON CONFLICT (metric_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rpc_function = EXCLUDED.rpc_function;

-- ============================================
-- 3. SEED: Templates-Base (3 bases para herança)
-- ============================================
INSERT INTO public.dashboard_templates (segment_key, name, description, is_base, base_template_key, template_json, plan_min)
VALUES
    -- BASE: Serviços (foco em agenda, clientes, financeiro básico)
    ('services_base', 'Base - Serviços', 'Template base para negócios de serviços', true, NULL,
     '{
        "globals": {
            "dateRange": "last_30_days",
            "currency": "BRL",
            "timezone": "America/Sao_Paulo"
        },
        "layout": [
            {"id": "kpi_revenue", "x": 0, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_expenses", "x": 3, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_net", "x": 6, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_clients", "x": 9, "y": 0, "w": 3, "h": 2},
            {"id": "chart_cashflow", "x": 0, "y": 2, "w": 8, "h": 4},
            {"id": "chart_categories", "x": 8, "y": 2, "w": 4, "h": 4},
            {"id": "table_recent", "x": 0, "y": 6, "w": 12, "h": 4}
        ],
        "widgets": {
            "kpi_revenue": {"type": "kpi_card", "title": "Receitas", "metric": "cash_in", "icon": "trending_up", "color": "green"},
            "kpi_expenses": {"type": "kpi_card", "title": "Despesas", "metric": "cash_out", "icon": "trending_down", "color": "red"},
            "kpi_net": {"type": "kpi_card", "title": "Saldo", "metric": "net_cash", "icon": "account_balance", "color": "blue"},
            "kpi_clients": {"type": "kpi_card", "title": "Clientes", "metric": "contacts_count", "icon": "people", "color": "purple"},
            "chart_cashflow": {"type": "line_timeseries", "title": "Fluxo de Caixa", "metrics": ["cash_in", "cash_out"], "showArea": true},
            "chart_categories": {"type": "donut_breakdown", "title": "Despesas por Categoria", "metric": "expenses_by_category"},
            "table_recent": {"type": "table_transactions", "title": "Transações Recentes", "metric": "transactions_recent"}
        },
        "enabledWidgets": ["kpi_card", "line_timeseries", "bar_grouped", "donut_breakdown", "table_transactions", "alerts_list"],
        "enabledMetrics": ["cash_in", "cash_out", "net_cash", "contacts_count", "revenue_by_category", "expenses_by_category", "transactions_recent"]
     }'::jsonb, 'start'),
    
    -- BASE: Comércio (foco em vendas, estoque, produtos)
    ('commerce_base', 'Base - Comércio', 'Template base para negócios de comércio/varejo', true, NULL,
     '{
        "globals": {
            "dateRange": "last_30_days",
            "currency": "BRL",
            "timezone": "America/Sao_Paulo"
        },
        "layout": [
            {"id": "kpi_sales", "x": 0, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_orders", "x": 3, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_profit", "x": 6, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_customers", "x": 9, "y": 0, "w": 3, "h": 2},
            {"id": "chart_sales", "x": 0, "y": 2, "w": 8, "h": 4},
            {"id": "chart_products", "x": 8, "y": 2, "w": 4, "h": 4},
            {"id": "table_orders", "x": 0, "y": 6, "w": 12, "h": 4}
        ],
        "widgets": {
            "kpi_sales": {"type": "kpi_card", "title": "Vendas", "metric": "cash_in", "icon": "payments", "color": "green"},
            "kpi_orders": {"type": "kpi_card", "title": "Pedidos", "metric": "transaction_count", "icon": "shopping_cart", "color": "blue"},
            "kpi_profit": {"type": "kpi_card", "title": "Lucro", "metric": "net_cash", "icon": "trending_up", "color": "emerald"},
            "kpi_customers": {"type": "kpi_card", "title": "Clientes", "metric": "contacts_count", "icon": "people", "color": "purple"},
            "chart_sales": {"type": "line_timeseries", "title": "Evolução das Vendas", "metrics": ["cash_in"], "showArea": true},
            "chart_products": {"type": "bar_grouped", "title": "Vendas por Categoria", "metric": "revenue_by_category"},
            "table_orders": {"type": "table_transactions", "title": "Últimos Pedidos", "metric": "transactions_recent"}
        },
        "enabledWidgets": ["kpi_card", "line_timeseries", "bar_grouped", "donut_breakdown", "table_transactions", "table_rank"],
        "enabledMetrics": ["cash_in", "cash_out", "net_cash", "transaction_count", "contacts_count", "revenue_by_category"]
     }'::jsonb, 'start'),
    
    -- BASE: Operações (foco em pipeline, leads, vendas B2B)
    ('ops_base', 'Base - Operações/B2B', 'Template base para operações, vendas B2B e CRM', true, NULL,
     '{
        "globals": {
            "dateRange": "last_30_days",
            "currency": "BRL",
            "timezone": "America/Sao_Paulo"
        },
        "layout": [
            {"id": "kpi_pipeline", "x": 0, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_deals", "x": 3, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_conversion", "x": 6, "y": 0, "w": 3, "h": 2},
            {"id": "kpi_leads", "x": 9, "y": 0, "w": 3, "h": 2},
            {"id": "funnel_sales", "x": 0, "y": 2, "w": 6, "h": 5},
            {"id": "chart_revenue", "x": 6, "y": 2, "w": 6, "h": 5},
            {"id": "table_deals", "x": 0, "y": 7, "w": 12, "h": 4}
        ],
        "widgets": {
            "kpi_pipeline": {"type": "kpi_card", "title": "Pipeline", "metric": "deals_value", "icon": "monetization_on", "color": "green"},
            "kpi_deals": {"type": "kpi_card", "title": "Negócios", "metric": "deals_count", "icon": "handshake", "color": "blue"},
            "kpi_conversion": {"type": "kpi_card", "title": "Conversão", "metric": "conversion_rate", "icon": "trending_up", "color": "amber"},
            "kpi_leads": {"type": "kpi_card", "title": "Leads", "metric": "contacts_count", "icon": "person_add", "color": "purple"},
            "funnel_sales": {"type": "funnel", "title": "Funil de Vendas", "metric": "deals_funnel"},
            "chart_revenue": {"type": "line_timeseries", "title": "Receita no Período", "metrics": ["cash_in"]},
            "table_deals": {"type": "table_transactions", "title": "Negócios Recentes", "metric": "transactions_recent"}
        },
        "enabledWidgets": ["kpi_card", "funnel", "line_timeseries", "bar_grouped", "table_transactions"],
        "enabledMetrics": ["deals_value", "deals_count", "deals_funnel", "contacts_count", "cash_in"]
     }'::jsonb, 'plus')
ON CONFLICT (segment_key) DO UPDATE SET
    template_json = EXCLUDED.template_json;

-- ============================================
-- 4. SEED: Templates por Segmento (12 segmentos do onboarding)
-- ============================================
INSERT INTO public.dashboard_templates (segment_key, name, description, is_base, base_template_key, template_json, plan_min)
VALUES
    -- 1. Serviços Técnicos (herda de services_base)
    ('technical_services', 'Serviços Técnicos', 'Assistência técnica, manutenção, reparos', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Clientes Atendidos", "icon": "engineering"}
        },
        "labels": {"currency_prefix": "R$"},
        "ctas": {"empty_state": "Importe suas ordens de serviço para começar"}
     }}'::jsonb, 'start'),
    
    -- 2. Profissionais Liberais (herda de services_base)
    ('liberal_professionals', 'Profissionais Liberais', 'Advogados, contadores, consultores', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Clientes Ativos", "icon": "gavel"},
            "kpi_revenue": {"title": "Honorários", "icon": "attach_money"}
        },
        "labels": {"transaction_label": "Honorário"},
        "ctas": {"empty_state": "Cadastre seus clientes e processos"}
     }}'::jsonb, 'start'),
    
    -- 3. Saúde & Bem-Estar (herda de services_base)
    ('health_wellness', 'Saúde & Bem-Estar', 'Clínicas, academias, terapeutas', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Pacientes", "icon": "favorite"},
            "kpi_revenue": {"title": "Faturamento", "icon": "medical_services"}
        },
        "labels": {"contact_label": "Paciente"},
        "ctas": {"empty_state": "Configure sua agenda de atendimentos"}
     }}'::jsonb, 'start'),
    
    -- 4. Imobiliária & Construção (herda de ops_base)
    ('real_estate', 'Imobiliária & Construção', 'Imóveis, obras, incorporação', false, 'ops_base',
     '{"overrides": {
        "widgets": {
            "kpi_pipeline": {"title": "Imóveis à Venda", "icon": "home"},
            "kpi_deals": {"title": "Propostas", "icon": "description"},
            "funnel_sales": {"title": "Funil de Vendas"}
        },
        "labels": {"deal_label": "Imóvel"},
        "ctas": {"empty_state": "Cadastre seus imóveis e propostas"}
     }}'::jsonb, 'plus'),
    
    -- 5. Comércio & Lojas (herda de commerce_base)
    ('retail', 'Comércio & Lojas', 'Varejo físico e online', false, 'commerce_base',
     '{"overrides": {
        "widgets": {
            "kpi_orders": {"title": "Vendas", "icon": "storefront"}
        },
        "labels": {},
        "ctas": {"empty_state": "Importe seu histórico de vendas"}
     }}'::jsonb, 'start'),
    
    -- 6. Alimentação & Restaurantes (herda de commerce_base)
    ('food', 'Alimentação & Restaurantes', 'Restaurantes, delivery, food service', false, 'commerce_base',
     '{"overrides": {
        "widgets": {
            "kpi_sales": {"title": "Vendas do Dia", "icon": "restaurant"},
            "kpi_orders": {"title": "Pedidos", "icon": "delivery_dining"}
        },
        "labels": {"order_label": "Pedido"},
        "ctas": {"empty_state": "Conecte seu sistema de pedidos"}
     }}'::jsonb, 'start'),
    
    -- 7. Transporte & Logística (herda de ops_base)
    ('logistics', 'Transporte & Logística', 'Entregas, frota, operações logísticas', false, 'ops_base',
     '{"overrides": {
        "widgets": {
            "kpi_pipeline": {"title": "Entregas Pendentes", "icon": "local_shipping"},
            "kpi_deals": {"title": "Rotas Ativas", "icon": "route"},
            "kpi_leads": {"title": "Clientes", "icon": "inventory_2"}
        },
        "labels": {"deal_label": "Entrega"},
        "ctas": {"empty_state": "Configure suas rotas de entrega"}
     }}'::jsonb, 'plus'),
    
    -- 8. Tecnologia & Software (herda de ops_base)
    ('tech', 'Tecnologia & Software', 'SaaS, desenvolvimento, TI', false, 'ops_base',
     '{"overrides": {
        "widgets": {
            "kpi_pipeline": {"title": "MRR", "icon": "code"},
            "kpi_deals": {"title": "Projetos", "icon": "terminal"},
            "kpi_leads": {"title": "Leads", "icon": "person_search"}
        },
        "labels": {"deal_label": "Projeto"},
        "ctas": {"empty_state": "Importe seus contratos e projetos"}
     }}'::jsonb, 'plus'),
    
    -- 9. Conteúdo & Criativos (herda de services_base)
    ('creative', 'Conteúdo & Criativos', 'Agências, freelancers, produção', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Clientes", "icon": "palette"},
            "kpi_revenue": {"title": "Projetos Faturados", "icon": "brush"}
        },
        "labels": {"project_label": "Campanha"},
        "ctas": {"empty_state": "Cadastre seus projetos criativos"}
     }}'::jsonb, 'start'),
    
    -- 10. Serviços Empresariais (herda de services_base)
    ('business_services', 'Serviços Empresariais', 'Consultorias, terceirizações, administrativo', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Contratos Ativos", "icon": "domain"},
            "kpi_revenue": {"title": "Faturamento", "icon": "business_center"}
        },
        "labels": {},
        "ctas": {"empty_state": "Configure seus contratos e clientes"}
     }}'::jsonb, 'start'),
    
    -- 11. Educação & Treinamento (herda de services_base)
    ('education', 'Educação & Treinamento', 'Escolas, cursos, treinamentos corporativos', false, 'services_base',
     '{"overrides": {
        "widgets": {
            "kpi_clients": {"title": "Alunos", "icon": "school"},
            "kpi_revenue": {"title": "Matrículas", "icon": "class"}
        },
        "labels": {"contact_label": "Aluno"},
        "ctas": {"empty_state": "Importe sua base de alunos"}
     }}'::jsonb, 'start'),
    
    -- 12. Outros/Personalizado (herda de services_base como fallback)
    ('other', 'Personalizado', 'Configuração personalizada baseada na descrição', false, 'services_base',
     '{"overrides": {
        "widgets": {},
        "labels": {},
        "ctas": {"empty_state": "A LIA irá personalizar seu painel conforme suas necessidades"}
     }}'::jsonb, 'start')
ON CONFLICT (segment_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_template_key = EXCLUDED.base_template_key,
    template_json = EXCLUDED.template_json;

-- ============================================
-- 5. SEED: Dados de exemplo para visualização
-- ============================================
-- Nota: Estes dados são inseridos apenas se não existirem transações
-- Usar em ambiente de desenvolvimento para testar gráficos

DO $$
DECLARE
    sample_tenant_id uuid;
    has_data boolean;
BEGIN
    -- Verificar se já existe algum tenant com dados
    SELECT EXISTS(SELECT 1 FROM public.transactions LIMIT 1) INTO has_data;
    
    -- Se não há dados, criar samples para testes
    IF NOT has_data THEN
        -- Criar tenant de exemplo
        INSERT INTO public.tenants (id, name, plan, segment_key)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant Exemplo', 'pro', 'technical_services')
        ON CONFLICT (id) DO NOTHING;
        
        sample_tenant_id := '00000000-0000-0000-0000-000000000001';
        
        -- Inserir transações de exemplo (últimos 30 dias)
        INSERT INTO public.transactions (tenant_id, date, description, type, category, amount, payment_method)
        SELECT 
            sample_tenant_id,
            CURRENT_DATE - (random() * 30)::int,
            CASE (random() * 5)::int
                WHEN 0 THEN 'Serviço de manutenção'
                WHEN 1 THEN 'Consultoria'
                WHEN 2 THEN 'Venda de produto'
                WHEN 3 THEN 'Assinatura mensal'
                ELSE 'Outros serviços'
            END,
            CASE WHEN random() > 0.3 THEN 'in' ELSE 'out' END,
            CASE (random() * 4)::int
                WHEN 0 THEN 'Serviços'
                WHEN 1 THEN 'Produtos'
                WHEN 2 THEN 'Assinaturas'
                WHEN 3 THEN 'Operacional'
                ELSE 'Outros'
            END,
            (random() * 5000 + 100)::numeric(15,2),
            CASE (random() * 3)::int
                WHEN 0 THEN 'Pix'
                WHEN 1 THEN 'Cartão'
                WHEN 2 THEN 'Boleto'
                ELSE 'Dinheiro'
            END
        FROM generate_series(1, 50);
        
        -- Inserir contatos de exemplo
        INSERT INTO public.contacts (tenant_id, name, email, type)
        SELECT 
            sample_tenant_id,
            'Cliente ' || n,
            'cliente' || n || '@exemplo.com',
            CASE (n % 3)
                WHEN 0 THEN 'customer'
                WHEN 1 THEN 'lead'
                ELSE 'prospect'
            END
        FROM generate_series(1, 20) as n;
        
        -- Inserir deals de exemplo
        INSERT INTO public.deals (tenant_id, title, stage, amount, probability, contact_name)
        SELECT 
            sample_tenant_id,
            'Oportunidade ' || n,
            CASE (n % 6)
                WHEN 0 THEN 'lead'
                WHEN 1 THEN 'contacted'
                WHEN 2 THEN 'proposal'
                WHEN 3 THEN 'negotiation'
                WHEN 4 THEN 'won'
                ELSE 'lost'
            END,
            (random() * 10000 + 500)::numeric(15,2),
            (random() * 100)::int,
            'Cliente ' || (n % 20 + 1)
        FROM generate_series(1, 30) as n;
        
        RAISE NOTICE 'Dados de exemplo criados para tenant %', sample_tenant_id;
    END IF;
END $$;

-- ============================================
-- FIM DA MIGRATION 003
-- ============================================
