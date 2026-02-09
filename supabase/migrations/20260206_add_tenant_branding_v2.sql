-- =====================================================
-- LUMINNUS PLATFORM - Multi-Tenancy Branding Support
-- =====================================================
-- Adiciona campos de identidade visual por tenant
-- Data: 2026-02-06

-- 1. Adicionar colunas de branding na tabela profiles (Garante idempotência)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_primary_color TEXT DEFAULT '#7C3AED';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_secondary_color TEXT DEFAULT '#EC4899';

-- 2. Indexação para performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);

-- 3. RLS: Limpeza e Recriação Segura de Políticas
-- Removemos primeiro para evitar erros de "already exists" ou conflitos de lógica
DROP POLICY IF EXISTS "Users can read own tenant branding" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own tenant branding" ON public.profiles;

-- Política para leitura do próprio branding
CREATE POLICY "Users can read own tenant branding"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Política para atualização do próprio branding
CREATE POLICY "Users can update own tenant branding"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Comentários para documentação
COMMENT ON COLUMN profiles.company_name IS 'Nome da empresa do tenant para exibição em relatórios';
COMMENT ON COLUMN profiles.company_logo_url IS 'URL da logo da empresa (Supabase Storage)';
COMMENT ON COLUMN profiles.company_primary_color IS 'Cor primária da marca (hex)';
COMMENT ON COLUMN profiles.company_secondary_color IS 'Cor secundária da marca (hex)';
