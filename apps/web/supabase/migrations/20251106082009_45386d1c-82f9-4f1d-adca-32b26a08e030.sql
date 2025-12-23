-- Criar tabela planos
CREATE TABLE public.planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plano_nome TEXT NOT NULL CHECK (plano_nome IN ('Start', 'Plus', 'Pro')),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'expirado', 'cancelado')),
  data_inicio TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  data_fim TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_planos_user_id ON public.planos(user_id);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios planos"
  ON public.planos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios planos"
  ON public.planos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela agendamentos
CREATE TABLE public.agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_agendamentos_user_id ON public.agendamentos(user_id);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus agendamentos"
  ON public.agendamentos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela whatsapp_messages
CREATE TABLE public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_whatsapp_user_id ON public.whatsapp_messages(user_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas mensagens"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas mensagens"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela usage_limits
CREATE TABLE public.usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  periodo_mes TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM') NOT NULL,
  conversas_count INTEGER DEFAULT 0 NOT NULL,
  mensagens_count INTEGER DEFAULT 0 NOT NULL,
  agendamentos_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, periodo_mes)
);

CREATE INDEX idx_usage_limits_user_id ON public.usage_limits(user_id);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus limites"
  ON public.usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus limites"
  ON public.usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus limites"
  ON public.usage_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Adicionar campos WhatsApp na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_numero TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'desconectado' CHECK (whatsapp_status IN ('conectado', 'desconectado', 'pendente')),
  ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ;

-- Função para incrementar usage_limits
CREATE OR REPLACE FUNCTION public.increment_usage_limit(
  p_user_id UUID,
  p_type TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO public.usage_limits (user_id, periodo_mes, conversas_count, mensagens_count, agendamentos_count)
  VALUES (
    p_user_id,
    v_periodo,
    CASE WHEN p_type = 'conversas' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'mensagens' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'agendamentos' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, periodo_mes) DO UPDATE SET
    conversas_count = CASE WHEN p_type = 'conversas' THEN usage_limits.conversas_count + 1 ELSE usage_limits.conversas_count END,
    mensagens_count = CASE WHEN p_type = 'mensagens' THEN usage_limits.mensagens_count + 1 ELSE usage_limits.mensagens_count END,
    agendamentos_count = CASE WHEN p_type = 'agendamentos' THEN usage_limits.agendamentos_count + 1 ELSE usage_limits.agendamentos_count END,
    updated_at = NOW();
END;
$$;

-- Trigger para atualizar updated_at em planos
CREATE TRIGGER update_planos_updated_at
BEFORE UPDATE ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em agendamentos
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em usage_limits
CREATE TRIGGER update_usage_limits_updated_at
BEFORE UPDATE ON public.usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();