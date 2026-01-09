-- Migração para LIA v1.1 - Ingestão de Arquivos

-- 1. Tabela de Metadados de Arquivos
CREATE TABLE IF NOT EXISTS public.files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid, -- Para isolamento multi-tenant futuro
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    storage_path text NOT NULL,
    hash text, -- Checksum para integridade
    metadata jsonb DEFAULT '{}', -- Metadados específicos do parser
    created_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
-- Usuários podem ver apenas seus próprios arquivos
CREATE POLICY "Users can view own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- Admins podem ver tudo (usando a função is_admin definida anteriormente)
CREATE POLICY "Admins can view all files" ON public.files
    FOR SELECT USING (public.is_admin(auth.uid()));

-- 4. Bucket de Armazenamento (Manual ou via SQL se o Supabase permitir)
-- Obs: Normalmente buckets são criados via dashboard ou script administrativo, 
-- mas deixamos registrado a necessidade do bucket 'lia-files'.
