-- Migration: Admin Panel Upgrade
-- Data: 2025-11-09
-- Descrição: Adiciona tabelas para gerenciamento de planos e histórico de conversas do admin

-- 1. Tabela de Configurações de Planos
CREATE TABLE IF NOT EXISTS plan_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  price TEXT,
  description TEXT,
  max_channels TEXT,
  max_conversations TEXT,
  max_messages TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por nome do plano
CREATE INDEX IF NOT EXISTS idx_plan_configs_plan_name ON plan_configs(plan_name);

-- Política RLS para plan_configs (somente admin pode acessar)
ALTER TABLE plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode ler configurações de planos"
  ON plan_configs FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode inserir configurações de planos"
  ON plan_configs FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode atualizar configurações de planos"
  ON plan_configs FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode deletar configurações de planos"
  ON plan_configs FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- 2. Tabela de Conversas do Admin
CREATE TABLE IF NOT EXISTS admin_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ordenação e busca
CREATE INDEX IF NOT EXISTS idx_admin_conversations_updated_at ON admin_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_created_at ON admin_conversations(created_at DESC);

-- Política RLS para admin_conversations (somente admin pode acessar)
ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode ler conversas"
  ON admin_conversations FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode criar conversas"
  ON admin_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode atualizar conversas"
  ON admin_conversations FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode deletar conversas"
  ON admin_conversations FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- 3. Tabela de Mensagens do Chat Admin
CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca rápida por conversa
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_conversation_id ON admin_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_created_at ON admin_chat_messages(created_at);

-- Política RLS para admin_chat_messages (somente admin pode acessar)
ALTER TABLE admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode ler mensagens"
  ON admin_chat_messages FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode criar mensagens"
  ON admin_chat_messages FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode deletar mensagens"
  ON admin_chat_messages FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em plan_configs
DROP TRIGGER IF EXISTS update_plan_configs_updated_at ON plan_configs;
CREATE TRIGGER update_plan_configs_updated_at
  BEFORE UPDATE ON plan_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at em admin_conversations
DROP TRIGGER IF EXISTS update_admin_conversations_updated_at ON admin_conversations;
CREATE TRIGGER update_admin_conversations_updated_at
  BEFORE UPDATE ON admin_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE plan_configs IS 'Configurações personalizadas dos planos (Start, Plus, Pro)';
COMMENT ON TABLE admin_conversations IS 'Histórico de conversas do painel administrativo';
COMMENT ON TABLE admin_chat_messages IS 'Mensagens das conversas do painel administrativo';

COMMENT ON COLUMN plan_configs.features IS 'Lista de recursos do plano em formato JSONB';
COMMENT ON COLUMN admin_conversations.message_count IS 'Contador de mensagens na conversa';
COMMENT ON COLUMN admin_chat_messages.role IS 'Papel da mensagem: user, assistant ou system';
