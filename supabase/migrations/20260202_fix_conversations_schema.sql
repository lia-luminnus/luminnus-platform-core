-- Migração para Sincronizar Tabela de Conversas com v4.0.0
-- Este script corrige a falta da coluna tenant_id e garante a paridade com o Backend

-- 1. Adicionar tenant_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.conversations ADD COLUMN tenant_id uuid;
    END IF;
END $$;

-- 2. Garantir que a coluna id use gerador de UUID se for text (para compatibilidade)
-- Nota: se já tiver dados, tomamos cuidado.
-- Se id for text mas quisermos uuid, o backend já lida com strings se necessário.
-- Mas vamos garantir que o default seja preenchido para novos inserts se a coluna for omitida.
ALTER TABLE public.conversations ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4()::text;

-- 3. Preencher tenant_id retroativamente se estiver nulo (usando o user_id como fallback)
UPDATE public.conversations SET tenant_id = user_id WHERE tenant_id IS NULL;

-- 4. Adicionar IDX para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- 5. Garantir RLS (Row Level Security)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias conversas
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários criarem conversas
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
CREATE POLICY "Users can create own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários deletarem conversas
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
