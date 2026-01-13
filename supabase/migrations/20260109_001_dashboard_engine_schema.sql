-- ==========================================================
-- DASHBOARD ENGINE MVP - MIGRATION 001
-- Schema Completo para Dashboard Config-Driven
-- ==========================================================
-- REGRA: Non-destructive. Usar CREATE IF NOT EXISTS.
-- ==========================================================

-- ============================================
-- 1. TABELA: tenants (Multi-tenancy base)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    plan text DEFAULT 'start' CHECK (plan IN ('start', 'plus', 'pro', 'enterprise')),
    segment_key text, -- Referência ao template de segmento
    owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Adicionar colunas se a tabela já existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='segment_key') THEN
        ALTER TABLE public.tenants ADD COLUMN segment_key text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='owner_user_id') THEN
        ALTER TABLE public.tenants ADD COLUMN owner_user_id uuid;
    END IF;
END $$;

-- ============================================
-- 2. TABELA: tenant_users (Mapeamento tenant <-> user)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member', 'viewer')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- ============================================
-- 3. TABELA: integration_accounts (Contas externas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.integration_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    integration_id uuid REFERENCES public.integrations_connections(id) ON DELETE CASCADE,
    external_account_id text,
    account_name text,
    metadata_json jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. TABELAS: ingest_jobs / ingest_rows (Pipeline de ingestão)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ingest_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    source text NOT NULL, -- 'csv', 'sheets', 'api', 'manual'
    source_name text, -- Nome do arquivo/fonte
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_rows integer DEFAULT 0,
    processed_rows integer DEFAULT 0,
    error_count integer DEFAULT 0,
    log jsonb DEFAULT '[]',
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingest_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.ingest_jobs(id) ON DELETE CASCADE,
    row_index integer,
    raw_json jsonb NOT NULL,
    mapped_json jsonb,
    entity_type text, -- 'transaction', 'invoice', 'deal', 'contact'
    entity_id uuid, -- ID da entidade criada (se sucesso)
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'created', 'error')),
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 5. TABELAS: Entidades normalizadas
-- ============================================

-- Transações financeiras
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    date date NOT NULL,
    description text,
    type text NOT NULL CHECK (type IN ('in', 'out')),
    category text,
    subcategory text,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'BRL',
    payment_method text,
    account text, -- Conta bancária/cartão
    tags text[],
    source text DEFAULT 'manual', -- 'manual', 'import', 'api', 'sheets'
    external_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Faturas/Notas fiscais
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    invoice_number text,
    issued_at date,
    due_at date,
    paid_at date,
    status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
    customer_name text,
    customer_email text,
    customer_id uuid, -- Ref para contacts se existir
    line_items jsonb DEFAULT '[]',
    subtotal numeric(15,2),
    tax_amount numeric(15,2),
    total_amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'BRL',
    source text DEFAULT 'manual',
    external_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Negócios/Oportunidades (CRM)
CREATE TABLE IF NOT EXISTS public.deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    stage text DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
    amount numeric(15,2),
    probability integer DEFAULT 50,
    expected_close_date date,
    contact_id uuid, -- Ref para contacts
    contact_name text,
    contact_email text,
    owner_user_id uuid,
    tags text[],
    notes text,
    source text DEFAULT 'manual',
    external_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Contatos
CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    role text,
    type text DEFAULT 'lead' CHECK (type IN ('lead', 'prospect', 'customer', 'partner', 'vendor', 'other')),
    tags text[],
    address jsonb,
    social_links jsonb,
    source text DEFAULT 'manual',
    external_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. TABELAS: Dashboard Templates & Config
-- ============================================

-- Templates base por segmento (com herança)
CREATE TABLE IF NOT EXISTS public.dashboard_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_key text UNIQUE NOT NULL, -- 'services_base', 'commerce_base', 'ops_base', 'services_technical', etc.
    name text NOT NULL,
    description text,
    base_template_key text, -- Referência ao template-pai para herança
    version integer DEFAULT 1,
    is_base boolean DEFAULT false, -- true para templates-base (services_base, commerce_base, ops_base)
    template_json jsonb NOT NULL, -- { globals, layout, widgets, overrides }
    plan_min text DEFAULT 'start',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Dashboards instanciados por tenant
CREATE TABLE IF NOT EXISTS public.tenant_dashboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    segment_key text, -- Segmento do onboarding
    name text DEFAULT 'Dashboard Principal',
    version integer DEFAULT 1,
    config_json jsonb NOT NULL, -- Config final renderizável (merged com template)
    is_active boolean DEFAULT true,
    created_from_template_id uuid REFERENCES public.dashboard_templates(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Histórico de versões do dashboard
CREATE TABLE IF NOT EXISTS public.tenant_dashboard_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_dashboard_id uuid NOT NULL REFERENCES public.tenant_dashboards(id) ON DELETE CASCADE,
    version integer NOT NULL,
    config_json jsonb NOT NULL,
    changed_by_user_id uuid,
    change_description text,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 7. TABELA: analytics_cache_daily (Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_cache_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    metric_key text NOT NULL,
    date date NOT NULL,
    value numeric,
    meta_json jsonb DEFAULT '{}', -- Dimensões adicionais, breakdown, etc.
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, metric_key, date)
);

-- ============================================
-- 8. TABELA: workspace_artifacts (Google Workspace Persistência)
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspace_artifacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('sheet', 'doc', 'slide', 'folder', 'form')),
    provider_resource_id text NOT NULL, -- fileId do Google Drive
    url text NOT NULL,
    name text NOT NULL,
    folder_id text, -- Pasta pai no Drive
    status text DEFAULT 'active' CHECK (status IN ('active', 'lost_404', 'permission_denied', 'archived')),
    context_tag text, -- Ex: 'financeiro_2025', 'crm_deals', 'relatorio_mensal'
    conversation_id uuid, -- Conversa onde foi criado (para contexto)
    metadata_json jsonb DEFAULT '{}',
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 9. TABELA: widget_registry (Catálogo de Widgets)
-- ============================================
CREATE TABLE IF NOT EXISTS public.widget_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_key text UNIQUE NOT NULL, -- 'kpi_card', 'line_timeseries', etc.
    name text NOT NULL,
    description text,
    category text, -- 'kpi', 'chart', 'table', 'special'
    icon text,
    default_config jsonb DEFAULT '{}', -- Configuração padrão
    supported_metrics text[], -- Métricas compatíveis
    plan_min text DEFAULT 'start',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 10. TABELA: metric_registry (Catálogo de Métricas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.metric_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key text UNIQUE NOT NULL, -- 'cash_in', 'cash_out', 'revenue_by_category', etc.
    name text NOT NULL,
    description text,
    unit text, -- 'currency', 'count', 'percent', 'ratio'
    default_aggregation text DEFAULT 'sum', -- 'sum', 'avg', 'count', 'min', 'max'
    source_entities text[], -- ['transactions', 'invoices']
    dimensions_supported text[], -- ['category', 'payment_method', 'date']
    sql_template text, -- Query base para cálculo
    rpc_function text, -- Nome da RPC no Supabase (se existir)
    prerequisites jsonb DEFAULT '{}', -- Tabelas/campos necessários
    plan_min text DEFAULT 'start',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 11. HABILITAR RLS EM TODAS AS NOVAS TABELAS
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_dashboard_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_registry ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. POLÍTICAS RLS (Isolamento por Tenant)
-- ============================================

-- Função auxiliar para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid AS $$
DECLARE
    tenant uuid;
BEGIN
    -- Primeiro tenta via JWT claim
    tenant := (auth.jwt() ->> 'tenant_id')::uuid;
    
    -- Se não tiver claim, busca na tabela tenant_users
    IF tenant IS NULL THEN
        SELECT tu.tenant_id INTO tenant
        FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    -- Fallback: user_id como tenant_id (single-tenant mode)
    IF tenant IS NULL THEN
        tenant := auth.uid();
    END IF;
    
    RETURN tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Políticas para tenants
DROP POLICY IF EXISTS "tenants_policy" ON public.tenants;
CREATE POLICY "tenants_policy" ON public.tenants
    FOR ALL USING (
        id = public.get_user_tenant_id() OR
        owner_user_id = auth.uid() OR
        public.is_admin(auth.uid())
    );

-- Políticas para tenant_users
DROP POLICY IF EXISTS "tenant_users_policy" ON public.tenant_users;
CREATE POLICY "tenant_users_policy" ON public.tenant_users
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id() OR
        user_id = auth.uid() OR
        public.is_admin(auth.uid())
    );

-- Políticas genéricas para tabelas com tenant_id
DROP POLICY IF EXISTS "integration_accounts_policy" ON public.integration_accounts;
CREATE POLICY "integration_accounts_policy" ON public.integration_accounts
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "ingest_jobs_policy" ON public.ingest_jobs;
CREATE POLICY "ingest_jobs_policy" ON public.ingest_jobs
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "ingest_rows_policy" ON public.ingest_rows;
CREATE POLICY "ingest_rows_policy" ON public.ingest_rows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ingest_jobs j 
            WHERE j.id = ingest_rows.job_id 
            AND (j.tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "transactions_policy" ON public.transactions;
CREATE POLICY "transactions_policy" ON public.transactions
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "invoices_policy" ON public.invoices;
CREATE POLICY "invoices_policy" ON public.invoices
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "deals_policy" ON public.deals;
CREATE POLICY "deals_policy" ON public.deals
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "contacts_policy" ON public.contacts;
CREATE POLICY "contacts_policy" ON public.contacts
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant_dashboards_policy" ON public.tenant_dashboards;
CREATE POLICY "tenant_dashboards_policy" ON public.tenant_dashboards
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant_dashboard_versions_policy" ON public.tenant_dashboard_versions;
CREATE POLICY "tenant_dashboard_versions_policy" ON public.tenant_dashboard_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tenant_dashboards td
            WHERE td.id = tenant_dashboard_versions.tenant_dashboard_id
            AND (td.tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "analytics_cache_daily_policy" ON public.analytics_cache_daily;
CREATE POLICY "analytics_cache_daily_policy" ON public.analytics_cache_daily
    FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "workspace_artifacts_policy" ON public.workspace_artifacts;
CREATE POLICY "workspace_artifacts_policy" ON public.workspace_artifacts
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id() OR 
        user_id = auth.uid() OR 
        public.is_admin(auth.uid())
    );

-- Templates e registros são públicos para leitura (catálogo)
DROP POLICY IF EXISTS "dashboard_templates_read" ON public.dashboard_templates;
CREATE POLICY "dashboard_templates_read" ON public.dashboard_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "dashboard_templates_write" ON public.dashboard_templates;
CREATE POLICY "dashboard_templates_write" ON public.dashboard_templates
    FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "widget_registry_read" ON public.widget_registry;
CREATE POLICY "widget_registry_read" ON public.widget_registry
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "widget_registry_write" ON public.widget_registry;
CREATE POLICY "widget_registry_write" ON public.widget_registry
    FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "metric_registry_read" ON public.metric_registry;
CREATE POLICY "metric_registry_read" ON public.metric_registry
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "metric_registry_write" ON public.metric_registry;
CREATE POLICY "metric_registry_write" ON public.metric_registry
    FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- 13. TRIGGERS PARA updated_at AUTOMÁTICO
-- ============================================

-- Reutiliza função existente ou cria se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica triggers nas novas tabelas
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'tenants', 'transactions', 'invoices', 'deals', 'contacts',
        'tenant_dashboards', 'workspace_artifacts', 'integration_accounts',
        'analytics_cache_daily', 'dashboard_templates'
    ]) LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_' || t || '_updated_at') THEN
            EXECUTE format('
                CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON public.%s
                FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()
            ', t, t);
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 14. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Entidades principais
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(tenant_id, type);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON public.invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_at ON public.invoices(tenant_id, due_at);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON public.deals(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type ON public.contacts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(tenant_id, email);

-- Dashboard
CREATE INDEX IF NOT EXISTS idx_tenant_dashboards_active ON public.tenant_dashboards(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_segment ON public.dashboard_templates(segment_key);

-- Cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_lookup ON public.analytics_cache_daily(tenant_id, metric_key, date DESC);

-- Workspace
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_tenant ON public.workspace_artifacts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_context ON public.workspace_artifacts(tenant_id, context_tag);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_resource ON public.workspace_artifacts(provider_resource_id);

-- ============================================
-- FIM DA MIGRATION 001
-- ============================================
