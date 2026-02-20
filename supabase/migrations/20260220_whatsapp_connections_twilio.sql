-- ==========================================================
-- 🔗 SUPABASE MIGRATION: Twilio SSOT e Admin Mode
-- ==========================================================
-- Migração: 20260220_whatsapp_connections_twilio.sql
-- Objetivo: Migrar o Provider e concentrar todos os dados de onboarding da Twilio (e Credenciais de Admin Mode) diretamente na tabela whatsapp_connections.
-- ==========================================================

-- A) Adicionando colunas de integração Twilio e Admin Mode
ALTER TABLE whatsapp_connections
    ADD COLUMN IF NOT EXISTS phone_number_e164 TEXT,
    ADD COLUMN IF NOT EXISTS connection_name TEXT,
    ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
    ADD COLUMN IF NOT EXISTS pn_sid TEXT,
    ADD COLUMN IF NOT EXISTS messaging_service_sid TEXT,
    ADD COLUMN IF NOT EXISTS admin_secret TEXT,
    ADD COLUMN IF NOT EXISTS admin_session_expires_at TIMESTAMPTZ;

-- B) Atualizando DEFAULT Provider
ALTER TABLE whatsapp_connections
    ALTER COLUMN provider SET DEFAULT 'twilio';

-- C) Índices Úteis
CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_twilio_sid ON whatsapp_connections(twilio_account_sid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conn_phone_e164 ON whatsapp_connections(phone_number_e164);

-- Comentários
COMMENT ON COLUMN whatsapp_connections.provider IS 'Provider SMS/WhatsApp: meta ou twilio. Default agora é twilio.';
COMMENT ON COLUMN whatsapp_connections.admin_secret IS 'Hash da senha de acesso ao Modo Admin para aquele tenant via WhatsApp.';
COMMENT ON COLUMN whatsapp_connections.admin_session_expires_at IS 'Expiração da sessão atual do admin logado via WhatsApp.';
