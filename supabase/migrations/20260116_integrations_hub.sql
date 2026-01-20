-- ============================================================
-- 🔌 SCHEMA: HUB DE INTEGRAÇÕES UNIVERSAL (API / WEBHOOKS)
-- ============================================================

-- 1. Chaves de API do Cliente (para o cliente bater na LIA)
CREATE TABLE IF NOT EXISTS public.hub_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL, -- ssk_... (secret service key)
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_hub_keys_api_key ON public.hub_keys(api_key);

-- 2. Webhooks de Saída (LIA avisa o sistema do cliente)
CREATE TABLE IF NOT EXISTS public.hub_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- lead.created, order.created, etc.
    secret TEXT NOT NULL, -- Para assinatura do payload
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Endpoints Externos (LIA bate no sistema do cliente)
CREATE TABLE IF NOT EXISTS public.hub_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    auth_type TEXT DEFAULT 'none' CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic')),
    auth_config JSONB DEFAULT '{}', -- encrypted: { key, value } ou { username, password }
    resources JSONB DEFAULT '[]', -- ['/customers', '/orders']
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mapeamento de Dados (Campos do cliente -> Modelo LIA)
CREATE TABLE IF NOT EXISTS public.hub_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL, -- lead, customer, order, appointment, ticket
    mapping_rules JSONB NOT NULL, -- { "nome_cliente": "customer_name", "valor": "amount" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, model_type)
);

-- 5. Logs de Integração
CREATE TABLE IF NOT EXISTS public.hub_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type TEXT NOT NULL, -- webhook, api_call, etc.
    service_name TEXT,
    endpoint TEXT,
    payload_in JSONB,
    payload_out JSONB,
    status_code INTEGER,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Atualização de Profile com Quotas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_lia_minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_reports_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quota_reset_at TIMESTAMPTZ DEFAULT NOW();

-- RLS POLICIES
ALTER TABLE public.hub_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_logs ENABLE ROW LEVEL SECURITY;

-- Políticas simples por tenant_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own hub keys') THEN
        CREATE POLICY "Users can see their own hub keys" ON public.hub_keys FOR ALL USING (auth.uid() = tenant_id);
        CREATE POLICY "Users can see their own hub webhooks" ON public.hub_webhooks FOR ALL USING (auth.uid() = tenant_id);
        CREATE POLICY "Users can see their own hub endpoints" ON public.hub_endpoints FOR ALL USING (auth.uid() = tenant_id);
        CREATE POLICY "Users can see their own hub mappings" ON public.hub_mappings FOR ALL USING (auth.uid() = tenant_id);
        CREATE POLICY "Users can see their own hub logs" ON public.hub_logs FOR ALL USING (auth.uid() = tenant_id);
    END IF;
END $$;
