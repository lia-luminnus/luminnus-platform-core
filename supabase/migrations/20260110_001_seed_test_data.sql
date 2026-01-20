-- ==========================================================
-- TEST DATA SEED: 2026-01-13 (CORRIGIDO)
-- Simula dados reais para diversos segmentos (Vendas, Clientes, Despesas)
-- Compatível com RPCs rpc_kpi_summary, rpc_metric_timeseries, etc.
-- ==========================================================

-- 1. Garante que temos um tenant de teste (usa o primeiro se existir)
DO $$
DECLARE
    v_tenant_id UUID;
    v_start_date DATE := CURRENT_DATE - INTERVAL '365 days'; -- 1 ano de dados
    v_end_date DATE := CURRENT_DATE;
    v_current_date DATE;
    v_base_amount NUMERIC;
    v_daily_variation NUMERIC;
BEGIN
    -- Tenta pegar o primeiro tenant ativo
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'Nenhum tenant encontrado. Por favor, complete o onboarding primeiro.';
        RETURN;
    END IF;

    RAISE NOTICE 'Populando dados para o tenant: %', v_tenant_id;

    -- Limpa transações de teste antigas
    DELETE FROM public.transactions WHERE tenant_id = v_tenant_id;

    -- 2. Gera Vendas (Entradas) - 365 dias de dados
    v_current_date := v_start_date;
    WHILE v_current_date <= v_end_date LOOP
        -- Variação sazonal: mais vendas no final do mês e em dezembro
        v_daily_variation := 1.0 + (EXTRACT(DAY FROM v_current_date)::NUMERIC / 31 * 0.3);
        IF EXTRACT(MONTH FROM v_current_date) = 12 THEN
            v_daily_variation := v_daily_variation * 1.5; -- 50% mais em dezembro
        END IF;
        
        -- 5 a 12 transações de entrada por dia
        FOR i IN 1..FLOOR(RANDOM() * 7 + 5) LOOP
            v_base_amount := (RANDOM() * 800 + 100) * v_daily_variation;
            
            INSERT INTO public.transactions (
                tenant_id, 
                date,  -- COLUNA CORRETA
                description, 
                type,  -- VALORES CORRETOS: 'in' ou 'out'
                category, 
                amount, 
                payment_method,
                currency,
                source,
                created_at
            ) VALUES (
                v_tenant_id,
                v_current_date,
                'Venda #' || i || ' - ' || to_char(v_current_date, 'DD/MM'),
                'in',  -- CORRETO: 'in' em vez de 'cash_in'
                CASE (FLOOR(RANDOM() * 6))::INT
                    WHEN 0 THEN 'Serviços'
                    WHEN 1 THEN 'Produtos'
                    WHEN 2 THEN 'Assinaturas'
                    WHEN 3 THEN 'Consultoria'
                    WHEN 4 THEN 'Licenças'
                    ELSE 'Vendas Diretas'
                END,
                v_base_amount::NUMERIC(10,2),
                CASE (FLOOR(RANDOM() * 4))::INT
                    WHEN 0 THEN 'Cartão de Crédito'
                    WHEN 1 THEN 'PIX'
                    WHEN 2 THEN 'Boleto'
                    ELSE 'Transferência'
                END,
                'BRL',
                'seed',
                v_current_date + (RANDOM() * INTERVAL '23 hours')
            );
        END LOOP;

        -- 3. Gera Despesas (Saídas) - 2 a 5 por dia
        FOR i IN 1..FLOOR(RANDOM() * 3 + 2) LOOP
            v_base_amount := (RANDOM() * 400 + 30) * (0.8 + v_daily_variation * 0.2);
            
            INSERT INTO public.transactions (
                tenant_id, 
                date,
                description, 
                type,
                category, 
                amount, 
                payment_method,
                currency,
                source,
                created_at
            ) VALUES (
                v_tenant_id,
                v_current_date,
                'Despesa Operacional #' || i,
                'out',  -- CORRETO: 'out' em vez de 'cash_out'
                CASE (FLOOR(RANDOM() * 5))::INT
                    WHEN 0 THEN 'Marketing'
                    WHEN 1 THEN 'Infra'
                    WHEN 2 THEN 'Suporte'
                    WHEN 3 THEN 'Operacional'
                    ELSE 'Pessoal'
                END,
                v_base_amount::NUMERIC(10,2),
                CASE (FLOOR(RANDOM() * 2))::INT
                    WHEN 0 THEN 'PIX'
                    ELSE 'Transferência'
                END,
                'BRL',
                'seed',
                v_current_date + (RANDOM() * INTERVAL '23 hours')
            );
        END LOOP;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    -- 4. Log de sucesso
    RAISE NOTICE 'Carga de dados de teste concluída com sucesso! 365 dias de transações geradas.';
END $$;

-- ==========================================================
-- VERIFICAÇÃO: Contagem de transações por período
-- ==========================================================
DO $$
DECLARE
    v_tenant_id UUID;
    v_count_today INTEGER;
    v_count_week INTEGER;
    v_count_month INTEGER;
    v_count_year INTEGER;
    v_total_in NUMERIC;
    v_total_out NUMERIC;
BEGIN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN RETURN; END IF;

    -- Contagens
    SELECT COUNT(*) INTO v_count_today FROM public.transactions 
    WHERE tenant_id = v_tenant_id AND date = CURRENT_DATE;
    
    SELECT COUNT(*) INTO v_count_week FROM public.transactions 
    WHERE tenant_id = v_tenant_id AND date >= CURRENT_DATE - 7;
    
    SELECT COUNT(*) INTO v_count_month FROM public.transactions 
    WHERE tenant_id = v_tenant_id AND date >= CURRENT_DATE - 30;
    
    SELECT COUNT(*) INTO v_count_year FROM public.transactions 
    WHERE tenant_id = v_tenant_id AND date >= CURRENT_DATE - 365;

    -- Totais (mês)
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_in, v_total_out
    FROM public.transactions
    WHERE tenant_id = v_tenant_id AND date >= CURRENT_DATE - 30;

    RAISE NOTICE '=== RESUMO DE DADOS DE TESTE ===';
    RAISE NOTICE 'Transações Hoje: %', v_count_today;
    RAISE NOTICE 'Transações Semana: %', v_count_week;
    RAISE NOTICE 'Transações Mês: %', v_count_month;
    RAISE NOTICE 'Transações Ano: %', v_count_year;
    RAISE NOTICE 'Receitas (30d): R$ %', v_total_in;
    RAISE NOTICE 'Despesas (30d): R$ %', v_total_out;
    RAISE NOTICE 'Saldo (30d): R$ %', v_total_in - v_total_out;
END $$;
