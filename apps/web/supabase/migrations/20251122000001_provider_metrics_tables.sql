-- Migration: Provider Metrics Tables
-- Data: 2025-11-22
-- Descrição: Cria tabelas unificadas para métricas de provedores, status e configurações

-- =====================================================
-- 1. TABELA: provider_metrics
-- Registra consumo diário por provedor
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_input NUMERIC DEFAULT 0,
  tokens_output NUMERIC DEFAULT 0,
  audio_minutes NUMERIC DEFAULT 0,
  requests NUMERIC DEFAULT 0,
  storage_mb NUMERIC DEFAULT 0,
  writes NUMERIC DEFAULT 0,
  reads NUMERIC DEFAULT 0,
  cost NUMERIC(12, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para evitar duplicatas por provedor/data
  UNIQUE(provider, date)
);

-- Índices para provider_metrics
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider ON provider_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_provider_metrics_date ON provider_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_metrics_created_at ON provider_metrics(created_at DESC);

-- RLS para provider_metrics
ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler provider_metrics"
  ON provider_metrics FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir provider_metrics"
  ON provider_metrics FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar provider_metrics"
  ON provider_metrics FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar provider_metrics"
  ON provider_metrics FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 2. TABELA: provider_status
-- Status online/offline de cada provedor
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_status (
  provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  online BOOLEAN DEFAULT TRUE,
  latency_ms NUMERIC DEFAULT 0,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para provider_status
ALTER TABLE provider_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler provider_status"
  ON provider_status FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir provider_status"
  ON provider_status FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar provider_status"
  ON provider_status FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 3. TABELA: provider_config
-- Salva configurações de cada provedor
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_config (
  provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para provider_config
ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler provider_config"
  ON provider_config FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir provider_config"
  ON provider_config FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar provider_config"
  ON provider_config FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 4. TABELA: provider_usage_log
-- Log detalhado de cada uso (para agregação)
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  metric_type TEXT NOT NULL, -- 'tokens', 'characters', 'request', 'storage', etc.
  value NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para provider_usage_log
CREATE INDEX IF NOT EXISTS idx_provider_usage_log_provider ON provider_usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_provider_usage_log_created_at ON provider_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_log_metric_type ON provider_usage_log(metric_type);

-- RLS para provider_usage_log
ALTER TABLE provider_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler provider_usage_log"
  ON provider_usage_log FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir provider_usage_log"
  ON provider_usage_log FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_provider_metrics_updated_at ON provider_metrics;
CREATE TRIGGER update_provider_metrics_updated_at
  BEFORE UPDATE ON provider_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_config_updated_at ON provider_config;
CREATE TRIGGER update_provider_config_updated_at
  BEFORE UPDATE ON provider_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. INSERIR STATUS INICIAIS
-- =====================================================
INSERT INTO provider_status (provider, online, latency_ms)
VALUES
  ('openai', true, 0),
  ('cartesia', true, 0),
  ('render', true, 0),
  ('cloudflare', true, 0),
  ('supabase', true, 0)
ON CONFLICT (provider) DO NOTHING;

-- =====================================================
-- 7. INSERIR CONFIGS PADRÃO
-- =====================================================
INSERT INTO provider_config (provider, config)
VALUES
  ('openai', '{"input_price_per_million": 0.15, "output_price_per_million": 0.60, "model": "gpt-4o-mini"}'::jsonb),
  ('cartesia', '{"price_per_minute": 0.042, "chars_per_minute": 850, "model": "sonic-3"}'::jsonb),
  ('render', '{"monthly_cost": 0, "instance_type": "Starter"}'::jsonb),
  ('cloudflare', '{"price_per_million_requests": 0.50, "plan": "free"}'::jsonb),
  ('supabase', '{"storage_price_per_gb": 0.021, "read_price_per_million": 0, "write_price_per_million": 0}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

-- =====================================================
-- 8. COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE provider_metrics IS 'Métricas consolidadas diárias por provedor';
COMMENT ON TABLE provider_status IS 'Status de saúde em tempo real dos provedores';
COMMENT ON TABLE provider_config IS 'Configurações de preços e settings de cada provedor';
COMMENT ON TABLE provider_usage_log IS 'Log detalhado de uso para agregação posterior';

COMMENT ON COLUMN provider_metrics.tokens_input IS 'Tokens de entrada (OpenAI)';
COMMENT ON COLUMN provider_metrics.tokens_output IS 'Tokens de saída (OpenAI)';
COMMENT ON COLUMN provider_metrics.audio_minutes IS 'Minutos de áudio (Cartesia)';
COMMENT ON COLUMN provider_metrics.requests IS 'Número de requisições (Render/Cloudflare)';
COMMENT ON COLUMN provider_metrics.storage_mb IS 'Armazenamento em MB (Supabase)';
COMMENT ON COLUMN provider_metrics.writes IS 'Operações de escrita (Supabase)';
COMMENT ON COLUMN provider_metrics.reads IS 'Operações de leitura (Supabase)';
COMMENT ON COLUMN provider_metrics.cost IS 'Custo calculado em USD';
