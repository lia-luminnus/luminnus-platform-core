-- Migration: Configurations Table
-- Data: 2025-11-22
-- Descrição: Cria tabela unificada de configurações com suporte a JSON

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_configurations_key ON configurations(key);

-- Política RLS para configurations (somente admin pode acessar)
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode ler configurations"
  ON configurations FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode inserir configurations"
  ON configurations FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode atualizar configurations"
  ON configurations FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Apenas admin pode deletar configurations"
  ON configurations FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_configurations_updated_at ON configurations;
CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO configurations (key, value)
VALUES
  ('lia_config', '{"openaiApiKey": "", "cartesiaApiKey": "", "cartesiaVoiceId": "", "renderApiUrl": "https://lia-chat-api.onrender.com", "webhookUrl": "", "systemPrompt": "Você é a LIA, uma assistente virtual inteligente e prestativa da plataforma Luminnus."}'),
  ('metrics_config', '{"openaiInputPrice": "0.15", "openaiOutputPrice": "0.60", "cartesiaPricePerMinute": "0.042", "cartesiaTotalCredits": "100", "cloudflarePricePerRequest": "0.50"}'),
  ('system_config', '{"panelUrl": "", "adminEmail": "", "maintenanceMode": false, "sessionTimeout": "30"}')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE configurations IS 'Configurações unificadas do sistema LIA Admin';
COMMENT ON COLUMN configurations.key IS 'Chave única da configuração';
COMMENT ON COLUMN configurations.value IS 'Valor JSON da configuração';
