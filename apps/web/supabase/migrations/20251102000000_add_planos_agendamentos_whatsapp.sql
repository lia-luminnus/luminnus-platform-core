-- Migração: Adicionar tabelas planos, agendamentos e campos WhatsApp
-- Data: 2025-11-02

-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plano_nome TEXT CHECK (plano_nome IN ('Start', 'Plus', 'Pro')) NOT NULL,
  status TEXT CHECK (status IN ('ativo', 'inativo', 'expirado', 'cancelado')) DEFAULT 'ativo',
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver e gerenciar apenas seus próprios planos
CREATE POLICY "Users can view own planos"
  ON public.planos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planos"
  ON public.planos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planos"
  ON public.planos FOR UPDATE
  USING (auth.uid() = user_id);

-- Índice para melhorar performance de busca por user_id e status
CREATE INDEX idx_planos_user_id_status ON public.planos(user_id, status);

-- Trigger: Atualizar updated_at automaticamente
CREATE TRIGGER update_planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  descricao TEXT,
  status TEXT CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')) DEFAULT 'pendente',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver e gerenciar apenas seus próprios agendamentos
CREATE POLICY "Users can view own agendamentos"
  ON public.agendamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agendamentos"
  ON public.agendamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agendamentos"
  ON public.agendamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agendamentos"
  ON public.agendamentos FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para melhorar performance de busca por user_id e data
CREATE INDEX idx_agendamentos_user_id_data ON public.agendamentos(user_id, data);

-- Trigger: Atualizar updated_at automaticamente
CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Adicionar campos WhatsApp à tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_numero TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT CHECK (whatsapp_status IN ('conectado', 'desconectado', 'pendente')) DEFAULT 'desconectado',
  ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMP WITH TIME ZONE;

-- 4. Tabela de Mensagens WhatsApp (para histórico)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT CHECK (status IN ('sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver apenas suas próprias mensagens
CREATE POLICY "Users can view own whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índice para melhorar performance
CREATE INDEX idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id, created_at DESC);

-- 5. Tabela de Limites de Uso por Plano
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  periodo_mes DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  conversas_count INTEGER DEFAULT 0,
  mensagens_count INTEGER DEFAULT 0,
  agendamentos_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, periodo_mes)
);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver apenas seus próprios limites
CREATE POLICY "Users can view own usage limits"
  ON public.usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage limits"
  ON public.usage_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage limits"
  ON public.usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger: Atualizar updated_at automaticamente
CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Função para verificar e criar limite de uso mensal
CREATE OR REPLACE FUNCTION public.get_or_create_usage_limit(p_user_id UUID)
RETURNS public.usage_limits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit usage_limits;
  v_current_month DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT * INTO v_limit
  FROM usage_limits
  WHERE user_id = p_user_id AND periodo_mes = v_current_month;

  IF NOT FOUND THEN
    INSERT INTO usage_limits (user_id, periodo_mes)
    VALUES (p_user_id, v_current_month)
    RETURNING * INTO v_limit;
  END IF;

  RETURN v_limit;
END;
$$;

-- 7. Função para incrementar contadores de uso
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_type TEXT  -- 'conversas', 'mensagens', ou 'agendamentos'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  -- Criar registro se não existir
  INSERT INTO usage_limits (user_id, periodo_mes)
  VALUES (p_user_id, v_current_month)
  ON CONFLICT (user_id, periodo_mes) DO NOTHING;

  -- Incrementar contador apropriado
  IF p_type = 'conversas' THEN
    UPDATE usage_limits
    SET conversas_count = conversas_count + 1
    WHERE user_id = p_user_id AND periodo_mes = v_current_month;
  ELSIF p_type = 'mensagens' THEN
    UPDATE usage_limits
    SET mensagens_count = mensagens_count + 1
    WHERE user_id = p_user_id AND periodo_mes = v_current_month;
  ELSIF p_type = 'agendamentos' THEN
    UPDATE usage_limits
    SET agendamentos_count = agendamentos_count + 1
    WHERE user_id = p_user_id AND periodo_mes = v_current_month;
  END IF;
END;
$$;
