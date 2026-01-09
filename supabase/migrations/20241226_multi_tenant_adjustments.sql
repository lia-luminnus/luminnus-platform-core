-- ==========================================================
-- LIA V1.1 ENTERPRISE - MIGRAÇÃO COMPLETA (ATUALIZADA)
-- ==========================================================
-- Esta migração inclui todas as tabelas e colunas necessárias
-- para a especificação LIA v1.1 Enterprise
-- ==========================================================

-- ============================================
-- 1. TABELA: integrations_connections
-- Armazena tokens OAuth por usuário e tenant
-- ============================================
CREATE TABLE IF NOT EXISTS public.integrations_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL, -- ex: 'google', 'microsoft', 'slack'
    access_token text,      -- Encriptar no futuro
    refresh_token text,     -- Encriptar no futuro
    scopes jsonb DEFAULT '[]',
    expires_at timestamptz,
    provider_email text,
    status text DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'error', 'revoked')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, user_id, provider)
);

-- ============================================
-- 2. TABELA: files (Seção 5.2 da Spec)
-- Metadados de arquivos processados pela LIA
-- ============================================
CREATE TABLE IF NOT EXISTS public.files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Campos básicos
    file_name text NOT NULL,
    file_type text,                   -- MIME type
    file_size bigint,                 -- bytes
    -- Storage (Seção 5.2)
    storage_path text,                -- Caminho no Supabase Storage / S3
    file_hash text,                   -- SHA256 para rastreabilidade
    -- Classificação (Seção 5.3)
    parse_method text,                -- vision_parse, text_parse, pdf_parse, office_parse, etc.
    -- Status de processamento
    status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'parsed', 'error')),
    error_message text,
    -- Métricas (Seção 7.2)
    processing_time_ms integer,       -- Tempo de processamento
    tokens_used integer,              -- Tokens consumidos (OpenAI/Gemini)
    -- Metadados extraídos
    extracted_metadata jsonb DEFAULT '{}',
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Adiciona colunas novas se a tabela já existia
DO $$ 
BEGIN 
    -- tenant_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='tenant_id') THEN
        ALTER TABLE public.files ADD COLUMN tenant_id uuid;
    END IF;
    -- file_hash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='file_hash') THEN
        ALTER TABLE public.files ADD COLUMN file_hash text;
    END IF;
    -- parse_method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='parse_method') THEN
        ALTER TABLE public.files ADD COLUMN parse_method text;
    END IF;
    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='status') THEN
        ALTER TABLE public.files ADD COLUMN status text DEFAULT 'uploaded';
    END IF;
    -- error_message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='error_message') THEN
        ALTER TABLE public.files ADD COLUMN error_message text;
    END IF;
    -- processing_time_ms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='processing_time_ms') THEN
        ALTER TABLE public.files ADD COLUMN processing_time_ms integer;
    END IF;
    -- tokens_used
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='tokens_used') THEN
        ALTER TABLE public.files ADD COLUMN tokens_used integer;
    END IF;
    -- extracted_metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='extracted_metadata') THEN
        ALTER TABLE public.files ADD COLUMN extracted_metadata jsonb DEFAULT '{}';
    END IF;
END $$;

-- ============================================
-- 3. TABELA: integration_activity_log (Seção 7.1)
-- Logs de auditoria de todas as ações
-- ============================================
CREATE TABLE IF NOT EXISTS public.integration_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    provider text NOT NULL,           -- 'native', 'google', 'microsoft', etc.
    action text NOT NULL,             -- file_ingested, file_parsed, execution_requested, etc.
    status text DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending', 'denied')),
    message text,
    -- Métricas adicionais (Seção 7.2)
    duration_ms integer,              -- Tempo da operação
    cost_tokens integer,              -- Tokens consumidos
    file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
    -- Contexto
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Adiciona colunas novas se a tabela já existia
DO $$ 
BEGIN 
    -- tenant_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_activity_log' AND column_name='tenant_id') THEN
        ALTER TABLE public.integration_activity_log ADD COLUMN tenant_id uuid;
    END IF;
    -- duration_ms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_activity_log' AND column_name='duration_ms') THEN
        ALTER TABLE public.integration_activity_log ADD COLUMN duration_ms integer;
    END IF;
    -- cost_tokens
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_activity_log' AND column_name='cost_tokens') THEN
        ALTER TABLE public.integration_activity_log ADD COLUMN cost_tokens integer;
    END IF;
    -- file_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='integration_activity_log' AND column_name='file_id') THEN
        ALTER TABLE public.integration_activity_log ADD COLUMN file_id uuid;
    END IF;
END $$;

-- ============================================
-- 4. TABELA: blocked_extensions (Seção 8)
-- Lista de extensões perigosas bloqueadas
-- ============================================
CREATE TABLE IF NOT EXISTS public.blocked_extensions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    extension text NOT NULL UNIQUE,   -- ex: '.exe', '.bat', '.sh'
    reason text,
    created_at timestamptz DEFAULT now()
);

-- Inserir extensões perigosas padrão
INSERT INTO public.blocked_extensions (extension, reason) VALUES
    ('.exe', 'Executável Windows'),
    ('.bat', 'Script batch Windows'),
    ('.cmd', 'Script command Windows'),
    ('.com', 'Executável DOS'),
    ('.scr', 'Screensaver (executável)'),
    ('.pif', 'Program Information File'),
    ('.vbs', 'VBScript'),
    ('.vbe', 'VBScript Encoded'),
    ('.js', 'JavaScript (quando não é código-fonte)'),
    ('.jse', 'JScript Encoded'),
    ('.ws', 'Windows Script'),
    ('.wsf', 'Windows Script File'),
    ('.wsc', 'Windows Script Component'),
    ('.wsh', 'Windows Script Host'),
    ('.ps1', 'PowerShell Script'),
    ('.ps1xml', 'PowerShell XML'),
    ('.ps2', 'PowerShell v2 Script'),
    ('.ps2xml', 'PowerShell v2 XML'),
    ('.psc1', 'PowerShell Console'),
    ('.psc2', 'PowerShell Console v2'),
    ('.msi', 'Windows Installer'),
    ('.msp', 'Windows Installer Patch'),
    ('.msu', 'Windows Update Package'),
    ('.dll', 'Dynamic Link Library'),
    ('.cpl', 'Control Panel Extension'),
    ('.jar', 'Java Archive (executável)'),
    ('.sh', 'Shell Script'),
    ('.bash', 'Bash Script'),
    ('.run', 'Linux Executable'),
    ('.app', 'macOS Application'),
    ('.dmg', 'macOS Disk Image'),
    ('.pkg', 'macOS Package')
ON CONFLICT (extension) DO NOTHING;

-- ============================================
-- 5. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================
ALTER TABLE public.integrations_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS RLS (Isolamento por Tenant)
-- ============================================
-- Remove políticas antigas
DROP POLICY IF EXISTS "access_own_connections" ON public.integrations_connections;
DROP POLICY IF EXISTS "access_own_files" ON public.files;
DROP POLICY IF EXISTS "access_own_logs" ON public.integration_activity_log;

-- Política: Usuário pode acessar seus próprios registros OU registros do seu tenant OU se for Admin
CREATE POLICY "access_own_connections" ON public.integrations_connections
    FOR ALL USING (
        auth.uid() = user_id OR 
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );

CREATE POLICY "access_own_files" ON public.files
    FOR ALL USING (
        auth.uid() = user_id OR 
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );

CREATE POLICY "access_own_logs" ON public.integration_activity_log
    FOR ALL USING (
        auth.uid() = user_id OR 
        tenant_id::text = COALESCE(auth.jwt() ->> 'tenant_id', auth.uid()::text) OR
        public.is_admin(auth.uid())
    );


-- ============================================
-- 7. TRIGGERS PARA updated_at AUTOMÁTICO
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica triggers apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_integrations_connections_updated_at') THEN
        CREATE TRIGGER update_integrations_connections_updated_at
            BEFORE UPDATE ON public.integrations_connections
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_files_updated_at') THEN
        CREATE TRIGGER update_files_updated_at
            BEFORE UPDATE ON public.files
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON public.files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON public.files(status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_tenant_id ON public.integration_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.integration_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.integration_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.integration_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connections_tenant_user ON public.integrations_connections(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON public.integrations_connections(provider);
