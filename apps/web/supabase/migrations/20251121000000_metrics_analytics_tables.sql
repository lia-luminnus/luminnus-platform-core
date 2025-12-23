-- Migration: Metrics & Analytics Tables
-- Data: 2025-11-21
-- Descrição: Adiciona tabelas para métricas de OpenAI, Cartesia, Render, Cloudflare e Supabase

-- =====================================================
-- 1. TABELA: metrics_openai
-- Métricas de uso da API OpenAI (GPT-4o-mini)
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_openai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  custo_estimado DECIMAL(10, 6) NOT NULL DEFAULT 0,
  modelo TEXT DEFAULT 'gpt-4o-mini',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_openai
CREATE INDEX IF NOT EXISTS idx_metrics_openai_empresa_id ON metrics_openai(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metrics_openai_usuario_id ON metrics_openai(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metrics_openai_data ON metrics_openai(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_openai_created_at ON metrics_openai(created_at DESC);

-- RLS para metrics_openai
ALTER TABLE metrics_openai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler métricas OpenAI"
  ON metrics_openai FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir métricas OpenAI"
  ON metrics_openai FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar métricas OpenAI"
  ON metrics_openai FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar métricas OpenAI"
  ON metrics_openai FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 2. TABELA: metrics_cartesia
-- Métricas de uso do Cartesia (TTS - Text to Speech)
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_cartesia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  caracteres_enviados INTEGER NOT NULL DEFAULT 0,
  creditos_usados DECIMAL(10, 4) NOT NULL DEFAULT 0,
  creditos_restantes DECIMAL(10, 4) DEFAULT 0,
  minutos_fala DECIMAL(10, 2) GENERATED ALWAYS AS (caracteres_enviados / 850.0) STORED,
  custo_estimado DECIMAL(10, 6) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_cartesia
CREATE INDEX IF NOT EXISTS idx_metrics_cartesia_empresa_id ON metrics_cartesia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cartesia_usuario_id ON metrics_cartesia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cartesia_data ON metrics_cartesia(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_cartesia_created_at ON metrics_cartesia(created_at DESC);

-- RLS para metrics_cartesia
ALTER TABLE metrics_cartesia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler métricas Cartesia"
  ON metrics_cartesia FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir métricas Cartesia"
  ON metrics_cartesia FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar métricas Cartesia"
  ON metrics_cartesia FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar métricas Cartesia"
  ON metrics_cartesia FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 3. TABELA: metrics_render
-- Métricas do servidor Render
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_render (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'degraded')),
  tempo_resposta_ms INTEGER DEFAULT 0,
  cpu_percent DECIMAL(5, 2) DEFAULT 0,
  ram_percent DECIMAL(5, 2) DEFAULT 0,
  chamadas_dia INTEGER NOT NULL DEFAULT 0,
  erros_500 INTEGER DEFAULT 0,
  erros_4xx INTEGER DEFAULT 0,
  logs_erro JSONB DEFAULT '[]'::jsonb,
  instancia_tipo TEXT DEFAULT 'Starter',
  custo_mensal DECIMAL(10, 2) DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_render
CREATE INDEX IF NOT EXISTS idx_metrics_render_data ON metrics_render(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_render_status ON metrics_render(status);
CREATE INDEX IF NOT EXISTS idx_metrics_render_created_at ON metrics_render(created_at DESC);

-- RLS para metrics_render
ALTER TABLE metrics_render ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler métricas Render"
  ON metrics_render FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir métricas Render"
  ON metrics_render FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar métricas Render"
  ON metrics_render FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar métricas Render"
  ON metrics_render FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 4. TABELA: metrics_cloudflare
-- Métricas do Cloudflare (Workers e automations)
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_cloudflare (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requests_dia INTEGER NOT NULL DEFAULT 0,
  tempo_execucao_ms INTEGER DEFAULT 0,
  erros_4xx INTEGER DEFAULT 0,
  erros_5xx INTEGER DEFAULT 0,
  workers_executados INTEGER DEFAULT 0,
  trafego_rota JSONB DEFAULT '{}'::jsonb,
  custo_estimado DECIMAL(10, 6) NOT NULL DEFAULT 0,
  plano TEXT DEFAULT 'free' CHECK (plano IN ('free', 'pro', 'business', 'enterprise')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_cloudflare
CREATE INDEX IF NOT EXISTS idx_metrics_cloudflare_empresa_id ON metrics_cloudflare(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cloudflare_data ON metrics_cloudflare(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_cloudflare_created_at ON metrics_cloudflare(created_at DESC);

-- RLS para metrics_cloudflare
ALTER TABLE metrics_cloudflare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler métricas Cloudflare"
  ON metrics_cloudflare FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir métricas Cloudflare"
  ON metrics_cloudflare FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar métricas Cloudflare"
  ON metrics_cloudflare FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar métricas Cloudflare"
  ON metrics_cloudflare FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 5. TABELA: metrics_supabase
-- Métricas do Supabase (Database)
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_supabase (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leituras_segundo DECIMAL(10, 2) DEFAULT 0,
  escritas_segundo DECIMAL(10, 2) DEFAULT 0,
  consumo_tabela JSONB DEFAULT '{}'::jsonb,
  tamanho_banco_mb DECIMAL(10, 2) DEFAULT 0,
  conexoes_abertas INTEGER DEFAULT 0,
  taxa_erros DECIMAL(5, 4) DEFAULT 0,
  consultas_lentas INTEGER DEFAULT 0,
  storage_usado_mb DECIMAL(10, 2) DEFAULT 0,
  storage_limite_mb DECIMAL(10, 2) DEFAULT 500,
  custo_estimado DECIMAL(10, 6) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_supabase
CREATE INDEX IF NOT EXISTS idx_metrics_supabase_data ON metrics_supabase(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_supabase_created_at ON metrics_supabase(created_at DESC);

-- RLS para metrics_supabase
ALTER TABLE metrics_supabase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler métricas Supabase"
  ON metrics_supabase FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir métricas Supabase"
  ON metrics_supabase FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar métricas Supabase"
  ON metrics_supabase FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar métricas Supabase"
  ON metrics_supabase FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 6. TABELA: metrics_summary
-- Resumo consolidado de métricas de todos os provedores
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fonte TEXT NOT NULL CHECK (fonte IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  quantidade DECIMAL(15, 4) NOT NULL DEFAULT 0,
  custo DECIMAL(10, 6) NOT NULL DEFAULT 0,
  detalhes JSONB DEFAULT '{}'::jsonb,
  periodo TEXT DEFAULT 'diario' CHECK (periodo IN ('diario', 'semanal', 'mensal')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_summary
CREATE INDEX IF NOT EXISTS idx_metrics_summary_empresa_id ON metrics_summary(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metrics_summary_usuario_id ON metrics_summary(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metrics_summary_fonte ON metrics_summary(fonte);
CREATE INDEX IF NOT EXISTS idx_metrics_summary_data ON metrics_summary(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_summary_periodo ON metrics_summary(periodo);
CREATE INDEX IF NOT EXISTS idx_metrics_summary_created_at ON metrics_summary(created_at DESC);

-- RLS para metrics_summary
ALTER TABLE metrics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler resumo de métricas"
  ON metrics_summary FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir resumo de métricas"
  ON metrics_summary FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar resumo de métricas"
  ON metrics_summary FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar resumo de métricas"
  ON metrics_summary FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 7. TABELA: metrics_alerts
-- Configurações e histórico de alertas
-- =====================================================
CREATE TABLE IF NOT EXISTS metrics_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fonte TEXT NOT NULL CHECK (fonte IN ('openai', 'cartesia', 'render', 'cloudflare', 'supabase')),
  tipo_alerta TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  nivel TEXT DEFAULT 'warning' CHECK (nivel IN ('info', 'warning', 'critical')),
  valor_atual DECIMAL(15, 4) DEFAULT 0,
  valor_limite DECIMAL(15, 4) DEFAULT 0,
  resolvido BOOLEAN DEFAULT FALSE,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metrics_alerts
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_fonte ON metrics_alerts(fonte);
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_nivel ON metrics_alerts(nivel);
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_resolvido ON metrics_alerts(resolvido);
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_created_at ON metrics_alerts(created_at DESC);

-- RLS para metrics_alerts
ALTER TABLE metrics_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler alertas"
  ON metrics_alerts FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode inserir alertas"
  ON metrics_alerts FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode atualizar alertas"
  ON metrics_alerts FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

CREATE POLICY "Admin pode deletar alertas"
  ON metrics_alerts FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'luminnus.lia.ai@gmail.com'
  ));

-- =====================================================
-- 8. TRIGGERS para updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_metrics_openai_updated_at ON metrics_openai;
CREATE TRIGGER update_metrics_openai_updated_at
  BEFORE UPDATE ON metrics_openai
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_cartesia_updated_at ON metrics_cartesia;
CREATE TRIGGER update_metrics_cartesia_updated_at
  BEFORE UPDATE ON metrics_cartesia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_render_updated_at ON metrics_render;
CREATE TRIGGER update_metrics_render_updated_at
  BEFORE UPDATE ON metrics_render
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_cloudflare_updated_at ON metrics_cloudflare;
CREATE TRIGGER update_metrics_cloudflare_updated_at
  BEFORE UPDATE ON metrics_cloudflare
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_supabase_updated_at ON metrics_supabase;
CREATE TRIGGER update_metrics_supabase_updated_at
  BEFORE UPDATE ON metrics_supabase
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_summary_updated_at ON metrics_summary;
CREATE TRIGGER update_metrics_summary_updated_at
  BEFORE UPDATE ON metrics_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. FUNÇÕES AUXILIARES para cálculos de custo
-- =====================================================

-- Função para calcular custo OpenAI (GPT-4o-mini)
-- Preços: Input $0.15/1M tokens, Output $0.60/1M tokens
CREATE OR REPLACE FUNCTION calcular_custo_openai(tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (tokens_in * 0.15 / 1000000.0) + (tokens_out * 0.60 / 1000000.0);
END;
$$ LANGUAGE plpgsql;

-- Função para calcular minutos de fala Cartesia
-- 850 caracteres = 1 minuto de fala
CREATE OR REPLACE FUNCTION calcular_minutos_cartesia(caracteres INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  RETURN caracteres / 850.0;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular custo Cloudflare Workers
-- Preço: $0.50/million requests (paid tier)
CREATE OR REPLACE FUNCTION calcular_custo_cloudflare(requests INTEGER, plano TEXT)
RETURNS DECIMAL AS $$
BEGIN
  IF plano = 'free' THEN
    RETURN 0;
  ELSE
    RETURN requests * 0.50 / 1000000.0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. COMENTÁRIOS para documentação
-- =====================================================
COMMENT ON TABLE metrics_openai IS 'Métricas de consumo da API OpenAI (GPT-4o-mini)';
COMMENT ON TABLE metrics_cartesia IS 'Métricas de uso do Cartesia TTS (Text-to-Speech)';
COMMENT ON TABLE metrics_render IS 'Métricas do servidor Render (status, performance)';
COMMENT ON TABLE metrics_cloudflare IS 'Métricas do Cloudflare Workers e automations';
COMMENT ON TABLE metrics_supabase IS 'Métricas do banco de dados Supabase';
COMMENT ON TABLE metrics_summary IS 'Resumo consolidado de todas as métricas por fonte';
COMMENT ON TABLE metrics_alerts IS 'Histórico de alertas de métricas';

COMMENT ON COLUMN metrics_openai.custo_estimado IS 'Custo em USD: (tokens_in * 0.15/1M) + (tokens_out * 0.60/1M)';
COMMENT ON COLUMN metrics_cartesia.minutos_fala IS 'Calculado automaticamente: caracteres / 850';
COMMENT ON COLUMN metrics_render.logs_erro IS 'JSON array com logs de erros do backend';
COMMENT ON COLUMN metrics_cloudflare.trafego_rota IS 'JSON com requests por rota';
COMMENT ON COLUMN metrics_supabase.consumo_tabela IS 'JSON com consumo por tabela do banco';
