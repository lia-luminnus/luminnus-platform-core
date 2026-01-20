-- ==========================================================
-- 🟢 MÓDULO WHATSAPP (AGENTE): SCHEMA INICIAL
-- ==========================================================

-- A) whatsapp_connections
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'meta', -- meta, twilio, gupshup, etc.
    status TEXT NOT NULL DEFAULT 'disconnected', -- connected, disconnected, error, pending
    config_json JSONB DEFAULT '{}'::jsonb,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B) whatsapp_contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    external_id TEXT NOT NULL, -- ID do contato no provedor (ex: número de telefone)
    name TEXT,
    phone TEXT,
    tags_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, external_id)
);

-- C) whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    external_id TEXT NOT NULL, -- ID da conversa no provedor
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- active, archived, resolved, waiting_human, waiting_client
    mode TEXT NOT NULL DEFAULT 'agent', -- agent, manual, copilot
    copiloto_enabled BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, external_id)
);

-- D) whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- inbound, outbound
    type TEXT NOT NULL DEFAULT 'text', -- text, audio, image, document, location
    body_text TEXT,
    media_url TEXT,
    media_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E) whatsapp_agent_settings
CREATE TABLE IF NOT EXISTS whatsapp_agent_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    segment_key TEXT, -- segment do tenant para carregar defaults
    profile_json JSONB DEFAULT '{
        "objective": "vendas",
        "tone": "consultivo",
        "language": "pt-BR",
        "working_hours": {},
        "handoff_rules": []
    }'::jsonb,
    playbooks_json JSONB DEFAULT '[]'::jsonb,
    knowledge_items_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- F) conversation_summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
    summary_type TEXT DEFAULT 'operational', -- operational, executive
    summary_text TEXT,
    audio_artifact_id TEXT, -- ID do artefato de áudio gerado pela LIA
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 🔒 POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ==========================================================

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Exemplo de política genérica por tenant_id
-- (Ajustar conforme o sistema de auth do projeto se necessário)

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_access_connections') THEN
        CREATE POLICY tenant_access_connections ON whatsapp_connections FOR ALL USING (tenant_id = auth.uid() OR true); -- Simplificado para dev, ideal usar claim de tenant
    END IF;
END $$;

-- Devido à complexidade de auth.uid() vs tenant_id real em cada projeto,
-- vamos aplicar uma política permissiva para dev que pode ser restrita depois.

CREATE POLICYIFNOTEXISTS "Allow tenant access" ON whatsapp_connections FOR ALL USING (true);
CREATE POLICYIFNOTEXISTS "Allow tenant access" ON whatsapp_contacts FOR ALL USING (true);
CREATE POLICYIFNOTEXISTS "Allow tenant access" ON whatsapp_conversations FOR ALL USING (true);
CREATE POLICYIFNOTEXISTS "Allow tenant access" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICYIFNOTEXISTS "Allow tenant access" ON whatsapp_agent_settings FOR ALL USING (true);
CREATE POLICYIFNOTEXISTS "Allow tenant access" ON conversation_summaries FOR ALL USING (true);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_summaries_conv ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone);
