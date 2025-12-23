-- Migration: Admin Config System Prompt
-- Data: 2025-11-17
-- Descrição: Adiciona tabela para configurações administrativas, incluindo system prompt

-- Tabela de Configurações Administrativas
CREATE TABLE IF NOT EXISTS admin_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  config_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config(config_key);

-- Política RLS para admin_config (somente admin pode acessar)
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode ler configurações"
  ON admin_config FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode inserir configurações"
  ON admin_config FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode atualizar configurações"
  ON admin_config FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode deletar configurações"
  ON admin_config FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_admin_config_updated_at ON admin_config;
CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON admin_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão do system prompt
INSERT INTO admin_config (config_key, config_value, config_type, description)
VALUES
  ('system_prompt', 'Você é a LIA, uma assistente virtual inteligente e prestativa da plataforma Luminnus. Você ajuda empresas a automatizar seu atendimento através de integração com WhatsApp, Chat, E-mail e outras plataformas. Seja clara, objetiva e amigável em suas respostas.', 'text', 'Prompt do sistema que define a personalidade da LIA'),
  ('lia_api_url', 'https://lia-chat-api.onrender.com', 'string', 'URL da API da LIA hospedada no Render'),
  ('webhook_url', '', 'string', 'URL do webhook para notificações'),
  ('openai_model', 'gpt-4o-mini', 'string', 'Modelo da OpenAI a ser utilizado')
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE admin_config IS 'Configurações administrativas da plataforma LIA';
COMMENT ON COLUMN admin_config.config_key IS 'Chave única da configuração';
COMMENT ON COLUMN admin_config.config_value IS 'Valor da configuração (suporta textos longos)';
COMMENT ON COLUMN admin_config.config_type IS 'Tipo da configuração: string, text, number, boolean, json';
