-- ============================================
-- TABELA: lia_configurations
-- Armazena as configurações da assistente LIA
-- ============================================
CREATE TABLE IF NOT EXISTS public.lia_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_api_key TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_role_key TEXT,
  render_api_url TEXT,
  webhook_url TEXT,
  system_prompt TEXT DEFAULT 'Você é a LIA, uma assistente virtual inteligente e prestativa.',
  metrics_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para lia_configurations
ALTER TABLE public.lia_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select on lia_configurations"
  ON public.lia_configurations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on lia_configurations"
  ON public.lia_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on lia_configurations"
  ON public.lia_configurations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_openai
-- Métricas de consumo da API OpenAI
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_openai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  empresa_id UUID,
  usuario_id UUID,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  custo_estimado DECIMAL(10,4) DEFAULT 0,
  modelo TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_openai
ALTER TABLE public.metrics_openai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_openai"
  ON public.metrics_openai
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_openai"
  ON public.metrics_openai
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_cartesia
-- Métricas de consumo do Cartesia (TTS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_cartesia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  empresa_id UUID,
  usuario_id UUID,
  caracteres_enviados INTEGER NOT NULL DEFAULT 0,
  creditos_usados INTEGER DEFAULT 0,
  creditos_restantes INTEGER DEFAULT 0,
  minutos_fala DECIMAL(10,2) DEFAULT 0,
  custo_estimado DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_cartesia
ALTER TABLE public.metrics_cartesia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_cartesia"
  ON public.metrics_cartesia
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_cartesia"
  ON public.metrics_cartesia
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_render
-- Métricas de performance do servidor Render
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_render (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'online',
  tempo_resposta_ms INTEGER DEFAULT 0,
  cpu_percent DECIMAL(5,2) DEFAULT 0,
  ram_percent DECIMAL(5,2) DEFAULT 0,
  chamadas_dia INTEGER DEFAULT 0,
  erros_500 INTEGER DEFAULT 0,
  erros_4xx INTEGER DEFAULT 0,
  logs_erro JSONB DEFAULT '[]'::jsonb,
  instancia_tipo TEXT DEFAULT 'Starter',
  custo_mensal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_render
ALTER TABLE public.metrics_render ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_render"
  ON public.metrics_render
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_render"
  ON public.metrics_render
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_cloudflare
-- Métricas de uso do Cloudflare Workers
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_cloudflare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  empresa_id UUID,
  requests_dia INTEGER DEFAULT 0,
  tempo_execucao_ms INTEGER DEFAULT 0,
  erros_4xx INTEGER DEFAULT 0,
  erros_5xx INTEGER DEFAULT 0,
  workers_executados INTEGER DEFAULT 0,
  trafego_rota JSONB DEFAULT '{}'::jsonb,
  custo_estimado DECIMAL(10,4) DEFAULT 0,
  plano TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_cloudflare
ALTER TABLE public.metrics_cloudflare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_cloudflare"
  ON public.metrics_cloudflare
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_cloudflare"
  ON public.metrics_cloudflare
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_supabase
-- Métricas de uso do banco Supabase
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_supabase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  leituras_segundo INTEGER DEFAULT 0,
  escritas_segundo INTEGER DEFAULT 0,
  consumo_tabela JSONB DEFAULT '{}'::jsonb,
  tamanho_banco_mb DECIMAL(10,2) DEFAULT 0,
  conexoes_abertas INTEGER DEFAULT 0,
  taxa_erros DECIMAL(5,2) DEFAULT 0,
  consultas_lentas INTEGER DEFAULT 0,
  storage_usado_mb DECIMAL(10,2) DEFAULT 0,
  storage_limite_mb DECIMAL(10,2) DEFAULT 1024,
  custo_estimado DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_supabase
ALTER TABLE public.metrics_supabase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_supabase"
  ON public.metrics_supabase
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_supabase"
  ON public.metrics_supabase
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TABELA: metrics_alerts
-- Alertas de métricas críticas
-- ============================================
CREATE TABLE IF NOT EXISTS public.metrics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte TEXT NOT NULL,
  tipo_alerta TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  nivel TEXT DEFAULT 'info',
  valor_atual DECIMAL(10,2) DEFAULT 0,
  valor_limite DECIMAL(10,2) DEFAULT 0,
  resolvido BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para metrics_alerts
ALTER TABLE public.metrics_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on metrics_alerts"
  ON public.metrics_alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on metrics_alerts"
  ON public.metrics_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on metrics_alerts"
  ON public.metrics_alerts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas de configuração
CREATE TRIGGER set_updated_at_lia_configurations
  BEFORE UPDATE ON public.lia_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metrics_openai
  BEFORE UPDATE ON public.metrics_openai
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metrics_cartesia
  BEFORE UPDATE ON public.metrics_cartesia
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metrics_render
  BEFORE UPDATE ON public.metrics_render
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metrics_cloudflare
  BEFORE UPDATE ON public.metrics_cloudflare
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metrics_supabase
  BEFORE UPDATE ON public.metrics_supabase
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();