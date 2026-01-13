-- ==========================================================
-- TEST DATA SEED: 2026-01-10
-- Simula dados reais para diversos segmentos (Vendas, Clientes, Despesas)
-- ==========================================================

-- 1. Garante que temos um tenant de teste (usa o primeiro se existir, senão cria)
DO $$
DECLARE
    v_tenant_id UUID;
    v_start_date DATE := CURRENT_DATE - INTERVAL '60 days';
    v_end_date DATE := CURRENT_DATE;
    v_current_date DATE;
BEGIN
    -- Tenta pegar o primeiro tenant ativo
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'Nenhum tenant encontrado. Por favor, complete o onboarding primeiro.';
        RETURN;
    END IF;

    RAISE NOTICE 'Populando dados para o tenant: %', v_tenant_id;

    -- Limpa transações de teste antigas (opcional, cuidado em prod)
    DELETE FROM public.transactions WHERE tenant_id = v_tenant_id;

    -- 2. Gera Vendas (Entradas) - Diversificado por Categoria e Cliente
    v_current_date := v_start_date;
    WHILE v_current_date <= v_end_date LOOP
        -- 3 a 8 transações por dia
        FOR i IN 1..FLOOR(RANDOM() * 5 + 3) LOOP
            INSERT INTO public.transactions (
                tenant_id, 
                amount, 
                type, 
                category, 
                description, 
                payment_method, 
                status, 
                transaction_date
            ) VALUES (
                v_tenant_id,
                (RANDOM() * 500 + 50)::NUMERIC(10,2),
                'cash_in',
                CASE (FLOOR(RANDOM() * 5))::INT
                    WHEN 0 THEN 'Serviços'
                    WHEN 1 THEN 'Produtos'
                    WHEN 2 THEN 'Assinaturas'
                    WHEN 3 THEN 'Consultoria'
                    ELSE 'Vendas Diretas'
                END,
                'Venda de Teste #' || i,
                CASE (FLOOR(RANDOM() * 3))::INT
                    WHEN 0 THEN 'Cartão de Crédito'
                    WHEN 1 THEN 'PIX'
                    ELSE 'Boleto'
                END,
                'completed',
                v_current_date + (RANDOM() * INTERVAL '23 hours')
            );
        END LOOP;

        -- 3. Gera Despesas (Saídas) - Custos Operacionais
        FOR i IN 1..FLOOR(RANDOM() * 3 + 1) LOOP
            INSERT INTO public.transactions (
                tenant_id, 
                amount, 
                type, 
                category, 
                description, 
                payment_method, 
                status, 
                transaction_date
            ) VALUES (
                v_tenant_id,
                (RANDOM() * 300 + 20)::NUMERIC(10,2),
                'cash_out',
                CASE (FLOOR(RANDOM() * 4))::INT
                    WHEN 0 THEN 'Infra'
                    WHEN 1 THEN 'Marketing'
                    WHEN 2 THEN 'Pessoal'
                    ELSE 'Outros'
                END,
                'Despesa Operacional #' || i,
                'PIX',
                'completed',
                v_current_date + (RANDOM() * INTERVAL '23 hours')
            );
        END LOOP;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    RAISE NOTICE 'Carga de dados de teste concluída com sucesso!';
END $$;
