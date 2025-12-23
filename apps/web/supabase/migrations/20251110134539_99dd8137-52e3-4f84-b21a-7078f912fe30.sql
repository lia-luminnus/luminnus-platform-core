-- Criar tabela admin_conversations
CREATE TABLE IF NOT EXISTS public.admin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para admin_conversations
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar conversas"
ON public.admin_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Criar tabela admin_chat_messages
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para admin_chat_messages
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar mensagens"
ON public.admin_chat_messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Índice para performance
CREATE INDEX idx_admin_chat_messages_conversation 
ON public.admin_chat_messages(conversation_id, created_at);

-- Criar tabela plan_configs
CREATE TABLE IF NOT EXISTS public.plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL,
  price TEXT,
  description TEXT,
  max_channels TEXT,
  max_conversations TEXT,
  max_messages TEXT,
  features TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para plan_configs
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver configurações de planos"
ON public.plan_configs
FOR SELECT
USING (true);

CREATE POLICY "Admins podem gerenciar configurações de planos"
ON public.plan_configs
FOR ALL
USING (true)
WITH CHECK (true);