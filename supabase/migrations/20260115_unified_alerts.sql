-- ==========================================================
-- 🔔 UNIFIED ALERTS SYSTEM
-- ==========================================================
-- Migração: 20260115_unified_alerts.sql
-- Objetivo: Unificar notificações de Prazos, Anomalias e Insights IA
-- ==========================================================

CREATE OR REPLACE FUNCTION public.rpc_get_unified_alerts(
    p_tenant_id uuid,
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    alert_id uuid,
    alert_type text, -- 'error' (anomalia), 'warning' (prazo), 'info' (insight), 'success'
    alert_title text,
    alert_message text,
    alert_timestamp timestamptz,
    alert_metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    (
        -- 1. Prazos Legais/Agendamentos (Prioridade Alta - Warning/Error se vencido)
        SELECT 
            id as alert_id,
            CASE 
                WHEN data < CURRENT_DATE THEN 'error' 
                ELSE 'warning' 
            END as alert_type,
            titulo as alert_title,
            COALESCE(descricao, 'Prazo agendado para hoje') as alert_message,
            (data + COALESCE(hora, '00:00:00'::time))::timestamptz as alert_timestamp,
            jsonb_build_object('source', 'agendamentos', 'original_id', id) as alert_metadata
        FROM public.agendamentos
        WHERE user_id IN (SELECT id FROM auth.users WHERE (raw_user_meta_data->>'tenant_id')::uuid = p_tenant_id)
          AND status != 'concluido'
          AND data >= (CURRENT_DATE - INTERVAL '1 day')
        
        UNION ALL

        -- 2. Anomalias Detectadas Recentemente (Extraídas do histórico de briefing)
        SELECT 
            id as alert_id,
            'error' as alert_type,
            'Anomalia Detectada' as alert_title,
            (anomalies_detected->0->>'message') as alert_message,
            created_at as alert_timestamp,
            jsonb_build_object('source', 'anomaly', 'briefing_id', id) as alert_metadata
        FROM public.brief_history
        WHERE tenant_id = p_tenant_id
          AND anomalies_detected IS NOT NULL
          AND jsonb_array_length(anomalies_detected) > 0
          AND created_at >= (NOW() - INTERVAL '48 hours')

        UNION ALL

        -- 3. Insights da LIA (Briefings recentes)
        SELECT 
            id as alert_id,
            'info' as alert_type,
            'Novo Insight da LIA' as alert_title,
            summary as alert_message,
            created_at as alert_timestamp,
            jsonb_build_object('source', 'insight', 'briefing_id', id) as alert_metadata
        FROM public.brief_history
        WHERE tenant_id = p_tenant_id
          AND summary IS NOT NULL
          AND created_at >= (NOW() - INTERVAL '24 hours')
    )
    ORDER BY alert_timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rpc_get_unified_alerts IS 'Retorna lista unificada de alertas críticos, prazos e insights para o tenant';
