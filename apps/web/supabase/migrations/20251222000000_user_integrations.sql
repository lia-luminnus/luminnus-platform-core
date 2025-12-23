-- =====================================================
-- TABELA: user_integrations
-- Fonte única de verdade para todas as integrações de usuários
-- =====================================================

-- Criar tabela principal de integrações
CREATE TABLE IF NOT EXISTS public.user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento com usuário
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificação da integração
    provider VARCHAR(50) NOT NULL, -- 'google_workspace', 'microsoft_365', 'slack', etc.
    
    -- Serviços específicos (para integrações compostas como Google Workspace)
    services TEXT[] DEFAULT '{}', -- ['gmail', 'calendar', 'drive', 'sheets', etc.]
    
    -- Tokens OAuth
    access_token TEXT,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    
    -- Metadados da conta conectada
    provider_user_id VARCHAR(255), -- ID do usuário no provedor (ex: Google User ID)
    provider_email VARCHAR(255), -- Email da conta conectada
    provider_name VARCHAR(255), -- Nome da conta conectada
    provider_avatar_url TEXT, -- Avatar da conta conectada
    
    -- Status da conexão
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    
    -- Configurações específicas da integração (JSON flexível)
    config JSONB DEFAULT '{}',
    
    -- Timestamps
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir uma integração por provedor por usuário
    UNIQUE(user_id, provider)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON public.user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON public.user_integrations(status);
CREATE INDEX IF NOT EXISTS idx_user_integrations_expires ON public.user_integrations(expires_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_integrations_updated_at ON public.user_integrations;
CREATE TRIGGER trigger_user_integrations_updated_at
    BEFORE UPDATE ON public.user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_integrations_updated_at();

-- =====================================================
-- TABELA: integration_activity_log
-- Log de atividades das integrações (conexões, sincs, erros)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.integration_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES public.user_integrations(id) ON DELETE SET NULL,
    
    -- Detalhes da atividade
    provider VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'connected', 'disconnected', 'synced', 'error', 'token_refreshed'
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'pending', 'error')),
    message TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.integration_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_provider ON public.integration_activity_log(provider);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.integration_activity_log(created_at DESC);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas para user_integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON public.user_integrations;
CREATE POLICY "Users can view own integrations" ON public.user_integrations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own integrations" ON public.user_integrations;
CREATE POLICY "Users can insert own integrations" ON public.user_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON public.user_integrations;
CREATE POLICY "Users can update own integrations" ON public.user_integrations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own integrations" ON public.user_integrations;
CREATE POLICY "Users can delete own integrations" ON public.user_integrations
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para integration_activity_log
DROP POLICY IF EXISTS "Users can view own activity log" ON public.integration_activity_log;
CREATE POLICY "Users can view own activity log" ON public.integration_activity_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity log" ON public.integration_activity_log;
CREATE POLICY "Users can insert own activity log" ON public.integration_activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNÇÃO: Registrar atividade de integração
-- =====================================================

CREATE OR REPLACE FUNCTION log_integration_activity(
    p_user_id UUID,
    p_provider VARCHAR(50),
    p_action VARCHAR(50),
    p_status VARCHAR(20) DEFAULT 'success',
    p_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_integration_id UUID;
    v_log_id UUID;
BEGIN
    -- Buscar integration_id se existir
    SELECT id INTO v_integration_id 
    FROM public.user_integrations 
    WHERE user_id = p_user_id AND provider = p_provider;
    
    -- Inserir log
    INSERT INTO public.integration_activity_log (
        user_id, integration_id, provider, action, status, message, metadata
    ) VALUES (
        p_user_id, v_integration_id, p_provider, p_action, p_status, p_message, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Verificar tokens expirados (para cron job)
-- =====================================================

CREATE OR REPLACE FUNCTION get_expiring_integrations(hours_threshold INT DEFAULT 1)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    provider VARCHAR(50),
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ui.id,
        ui.user_id,
        ui.provider,
        ui.expires_at
    FROM public.user_integrations ui
    WHERE ui.status = 'active'
      AND ui.refresh_token IS NOT NULL
      AND ui.expires_at IS NOT NULL
      AND ui.expires_at < (NOW() + (hours_threshold || ' hours')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comentários para documentação
-- =====================================================

COMMENT ON TABLE public.user_integrations IS 'Armazena todas as integrações conectadas pelos usuários (OAuth tokens, status, metadados)';
COMMENT ON TABLE public.integration_activity_log IS 'Log de atividades das integrações (conexões, sincronizações, erros)';
COMMENT ON COLUMN public.user_integrations.services IS 'Para integrações compostas como Google Workspace: ["gmail", "calendar", "drive"]';
COMMENT ON COLUMN public.user_integrations.config IS 'Configurações específicas da integração em formato JSON';
