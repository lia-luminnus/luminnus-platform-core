-- ==========================================================
-- 🧠 WHATSAPP INTELLIGENCE: SCHEMA ADITIVO
-- ==========================================================
-- Migração: 20260113_whatsapp_intelligence.sql
-- Objetivo: Adicionar Event Store, Kanban/Leads, Audio Inbox e Briefings
-- REGRA: Não remover nem alterar tabelas existentes

-- ==========================================================
-- A) EVENT STORE (Auditoria e Real-time)
-- ==========================================================
CREATE TABLE IF NOT EXISTS whatsapp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    type TEXT NOT NULL, -- message_received, lead_created, intent_detected, human_handoff, meeting_booked, audio_received, stage_changed
    conversation_id UUID,
    contact_id UUID,
    payload_json JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_tenant_type ON whatsapp_events(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_occurred ON whatsapp_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_conversation ON whatsapp_events(conversation_id);

COMMENT ON TABLE whatsapp_events IS 'Event Store para auditoria e broadcast em tempo real via WebSocket';

-- ==========================================================
-- B) LEADS / KANBAN (Pipeline SDR)
-- ==========================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'whatsapp', -- whatsapp, website, import, api, manual
    stage TEXT NOT NULL DEFAULT 'NEW', -- NEW, QUALIFIED_BY_LIA, WAITING_HUMAN, SCHEDULED, WON, LOST
    urgency_score INTEGER DEFAULT 0 CHECK (urgency_score >= 0 AND urgency_score <= 100),
    sentiment_score INTEGER DEFAULT 50 CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
    agent_mode TEXT DEFAULT 'SDR', -- SDR, SUPPORT, RH, FINANCE, SCHEDULING
    assigned_to UUID, -- user_id do humano responsável
    company_name TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    tags_json JSONB DEFAULT '[]'::jsonb,
    custom_fields_json JSONB DEFAULT '{}'::jsonb,
    last_message_at TIMESTAMPTZ,
    next_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_stage ON leads(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_urgency ON leads(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_agent_mode ON leads(tenant_id, agent_mode);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

COMMENT ON TABLE leads IS 'Pipeline de leads para Kanban SDR com scores de urgência e sentimento';

-- ==========================================================
-- C) AUDIO ASSETS (Inbox Inteligente de Áudios)
-- ==========================================================
CREATE TABLE IF NOT EXISTS audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    message_id UUID REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
    media_url TEXT,
    media_id TEXT,
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    transcript_text TEXT,
    summary_text TEXT,
    tags_json JSONB DEFAULT '[]'::jsonb, -- ["#Orçamento", "#Reclamação", "#Urgente"]
    intent_detected TEXT, -- pricing, complaint, question, scheduling, support
    sentiment TEXT, -- positive, neutral, negative
    status TEXT DEFAULT 'pending', -- pending, transcribing, summarizing, done, failed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_tenant ON audio_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_status ON audio_assets(status);
CREATE INDEX IF NOT EXISTS idx_audio_assets_conversation ON audio_assets(conversation_id);

-- Full-text search na transcrição
CREATE INDEX IF NOT EXISTS idx_audio_assets_transcript_fts ON audio_assets USING gin(to_tsvector('portuguese', COALESCE(transcript_text, '')));

COMMENT ON TABLE audio_assets IS 'Inbox de áudios com transcrição, resumo e tags automáticas';

-- ==========================================================
-- D) BRIEFING RULES (Configuração de Relatórios Programados)
-- ==========================================================
CREATE TABLE IF NOT EXISTS briefing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    schedule_cron TEXT, -- "0 8 * * 1-5" = 8h seg-sex
    schedule_timezone TEXT DEFAULT 'America/Sao_Paulo',
    recipients_json JSONB DEFAULT '[]'::jsonb, -- [{"phone": "+5511999999999", "name": "João"}]
    kpis_json JSONB DEFAULT '[]'::jsonb, -- ["leads_today", "response_time_avg", "sentiment_avg", "conversion_rate"]
    filters_json JSONB DEFAULT '{}'::jsonb, -- {"agent_mode": "SDR", "date_range": "today"}
    channel TEXT DEFAULT 'whatsapp', -- whatsapp, email, both
    template TEXT, -- template customizado (opcional)
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefing_rules_tenant ON briefing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefing_rules_enabled ON briefing_rules(enabled, next_run_at);

COMMENT ON TABLE briefing_rules IS 'Regras de briefings programados (diários, semanais, etc.)';

-- ==========================================================
-- E) BRIEFING RUNS (Execuções de Briefings)
-- ==========================================================
CREATE TABLE IF NOT EXISTS briefing_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_id UUID REFERENCES briefing_rules(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    triggered_by TEXT DEFAULT 'scheduler', -- scheduler, manual, api
    kpis_computed_json JSONB DEFAULT '{}'::jsonb, -- KPIs calculados
    message_sent TEXT, -- Mensagem final enviada
    recipients_notified_json JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefing_runs_tenant ON briefing_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefing_runs_rule ON briefing_runs(rule_id);
CREATE INDEX IF NOT EXISTS idx_briefing_runs_status ON briefing_runs(status);

COMMENT ON TABLE briefing_runs IS 'Histórico de execuções de briefings';

-- ==========================================================
-- F) ALTERAÇÕES EM TABELAS EXISTENTES (ADITIVO)
-- ==========================================================

-- Adicionar agent_mode à tabela de conversas
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS agent_mode TEXT DEFAULT 'SDR';

-- Adicionar campos de copiloto à tabela de conversas (se não existir)
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS copilot_suggestion TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS copilot_suggested_at TIMESTAMPTZ;

-- Adicionar assigned_to à tabela de conversas
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- ==========================================================
-- G) RLS (Row Level Security)
-- ==========================================================
ALTER TABLE whatsapp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_runs ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para dev (ajustar para produção)
DO $$ 
BEGIN
    -- whatsapp_events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_whatsapp_events') THEN
        CREATE POLICY allow_all_whatsapp_events ON whatsapp_events FOR ALL USING (true);
    END IF;
    
    -- leads
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_leads') THEN
        CREATE POLICY allow_all_leads ON leads FOR ALL USING (true);
    END IF;
    
    -- audio_assets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_audio_assets') THEN
        CREATE POLICY allow_all_audio_assets ON audio_assets FOR ALL USING (true);
    END IF;
    
    -- briefing_rules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_briefing_rules') THEN
        CREATE POLICY allow_all_briefing_rules ON briefing_rules FOR ALL USING (true);
    END IF;
    
    -- briefing_runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_briefing_runs') THEN
        CREATE POLICY allow_all_briefing_runs ON briefing_runs FOR ALL USING (true);
    END IF;
END $$;

-- ==========================================================
-- H) FUNÇÕES RPC ÚTEIS
-- ==========================================================

-- Função para mover lead entre stages
CREATE OR REPLACE FUNCTION move_lead_stage(
    p_lead_id UUID,
    p_new_stage TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS leads AS $$
DECLARE
    v_lead leads;
    v_old_stage TEXT;
BEGIN
    SELECT stage INTO v_old_stage FROM leads WHERE id = p_lead_id;
    
    UPDATE leads 
    SET stage = p_new_stage, 
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_lead_id
    RETURNING * INTO v_lead;
    
    -- Registrar evento de mudança de stage
    INSERT INTO whatsapp_events (tenant_id, type, payload_json, occurred_at)
    VALUES (
        v_lead.tenant_id, 
        'stage_changed', 
        jsonb_build_object(
            'lead_id', p_lead_id,
            'old_stage', v_old_stage,
            'new_stage', p_new_stage
        ),
        NOW()
    );
    
    RETURN v_lead;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar KPIs do dashboard
CREATE OR REPLACE FUNCTION get_whatsapp_kpis(p_tenant_id UUID, p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours')
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'leads_total', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND created_at >= p_date_from),
        'leads_new', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND stage = 'NEW' AND created_at >= p_date_from),
        'leads_qualified', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND stage = 'QUALIFIED_BY_LIA' AND created_at >= p_date_from),
        'leads_won', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND stage = 'WON' AND created_at >= p_date_from),
        'messages_received', (SELECT COUNT(*) FROM whatsapp_messages WHERE tenant_id = p_tenant_id AND direction = 'inbound' AND created_at >= p_date_from),
        'messages_sent', (SELECT COUNT(*) FROM whatsapp_messages WHERE tenant_id = p_tenant_id AND direction = 'outbound' AND created_at >= p_date_from),
        'audios_pending', (SELECT COUNT(*) FROM audio_assets WHERE tenant_id = p_tenant_id AND status = 'pending'),
        'audios_transcribed', (SELECT COUNT(*) FROM audio_assets WHERE tenant_id = p_tenant_id AND status = 'done' AND created_at >= p_date_from),
        'avg_sentiment', (SELECT COALESCE(AVG(sentiment_score), 50) FROM leads WHERE tenant_id = p_tenant_id AND created_at >= p_date_from),
        'avg_urgency', (SELECT COALESCE(AVG(urgency_score), 0) FROM leads WHERE tenant_id = p_tenant_id AND created_at >= p_date_from)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION move_lead_stage IS 'Move um lead para outro stage e registra evento';
COMMENT ON FUNCTION get_whatsapp_kpis IS 'Retorna KPIs agregados do WhatsApp para o dashboard';
