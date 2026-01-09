-- SCRIPT DE REPARO: LUMINNUS CORE & METRICS (V3 - FINAL)
-- Execute este script no SQL Editor do Supabase para corrigir os erros 400/500/404 de vez.

-- 1. Reparar tabela de Perfis (Fix Erros 400 no Dashboard e Usuários)
DO $$ 
BEGIN 
    -- Garantir plan_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_type') THEN
        ALTER TABLE profiles ADD COLUMN plan_type TEXT DEFAULT 'cliente';
    END IF;
    
    -- Garantir full_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Garantir company_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='company_name') THEN
        ALTER TABLE profiles ADD COLUMN company_name TEXT;
    END IF;
END $$;

-- 2. Reparar e Unificar Tabela de Métricas
CREATE TABLE IF NOT EXISTS provider_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    empresa_id UUID,
    usuario_id UUID,
    tokens_input BIGINT DEFAULT 0,
    tokens_output BIGINT DEFAULT 0,
    requests BIGINT DEFAULT 0,
    reads BIGINT DEFAULT 0,
    writes BIGINT DEFAULT 0,
    storage_mb NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Garantir colunas essenciais na metrics
ALTER TABLE provider_metrics ADD COLUMN IF NOT EXISTS tokens_input BIGINT DEFAULT 0;
ALTER TABLE provider_metrics ADD COLUMN IF NOT EXISTS tokens_output BIGINT DEFAULT 0;
ALTER TABLE provider_metrics ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
ALTER TABLE provider_metrics ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE provider_metrics ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- 3. Corrigir RLS da user_roles (Fix Erro 500 - Limpeza Total)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
-- Dropar absolutamente todas as políticas para reconstruir do zero
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON user_roles';
    END LOOP;
END $$;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política de leitura sem recursão baseada no Auth ID
CREATE POLICY "view_own_roles_v3" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Política de Admin baseada DIRETAMENTE no email do JWT (Segurança Máxima + Sem Recursão)
CREATE POLICY "admin_all_roles_v3" ON user_roles FOR ALL 
USING ( (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com' );

-- 4. Habilitar RLS para Métricas
ALTER TABLE provider_metrics DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'provider_metrics') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON provider_metrics';
    END LOOP;
END $$;

ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all metrics_v3" ON provider_metrics FOR ALL 
USING ( (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com' );

-- 5. Criar Tabela de Status e Seed
CREATE TABLE IF NOT EXISTS provider_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider TEXT NOT NULL UNIQUE,
    online BOOLEAN DEFAULT TRUE,
    latency_ms INTEGER,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

INSERT INTO provider_status (provider, online) 
VALUES ('openai', true), ('gemini', true), ('render', true), ('cloudflare', true), ('supabase', true)
ON CONFLICT (provider) DO NOTHING;

-- 6. Grant Permissions
GRANT ALL ON provider_metrics TO authenticated;
GRANT ALL ON provider_status TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON profiles TO authenticated;
