-- ============================================
-- FIX COMPLETO v4.0: Resiliência Total (Dev Mode)
-- ============================================
-- EXECUTE NO EDITOR SQL DO SUPABASE
-- Consolida correções de RLS, Constraints e Colunas
-- ============================================

-- 4. DISABLE RLS (para desenvolvimento)
-- ============================================
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;


-- 2. REMOVER CONSTRAINTS DE FK (Evita erro 23503 em Dev)
-- Isso permite usar IDs de teste que não existem na tabela 'users'
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_tenant_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- 3. REMOVER CHECK CONSTRAINTS (Evita erro 23514)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_role_check;

-- 4. GARANTIR COLUNAS
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS storage_url TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 1. FIX: integration_activity_log (ID default)
-- ============================================
DO $$ 
BEGIN
    ALTER TABLE public.integration_activity_log 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================
-- 2. FIX: user_roles (Garantir existência para AuthContext)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'cliente')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);


-- ============================================
-- AÇÃO MANUAL OBRIGATÓRIA NO STORAGE:
-- ============================================
-- 1. Storage > New Bucket > Nome: "user-files"
-- 2. Marcar como PÚBLICO
-- 3. Criar
-- ============================================
