-- ============================================================
-- Correção de RLS para Suporte a Contas Pessoais e Multimodalidade
-- Data: 2026-01-29
-- Problema: 403 Forbidden ao listar arquivos em contas onde tenant_id = user_id
-- ============================================================

-- 1. Atualizar políticas RLS para files (fallback para auth.uid())
DROP POLICY IF EXISTS "Tenant view files" ON files;
DROP POLICY IF EXISTS "Tenant insert files" ON files;
DROP POLICY IF EXISTS "Tenant update files" ON files;
DROP POLICY IF EXISTS "Tenant delete files" ON files;

-- View: Permitir leitura se tenant_id matches (com fallback para auth.uid())
CREATE POLICY "Tenant view files" ON files FOR SELECT
USING (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
);

-- Insert: Permitir inserção se tenant_id matches
CREATE POLICY "Tenant insert files" ON files FOR INSERT
WITH CHECK (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
);

-- Update: Permitir atualização se tenant_id matches
CREATE POLICY "Tenant update files" ON files FOR UPDATE
USING (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
)
WITH CHECK (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
);

-- Delete: Permitir deleção se tenant_id matches
CREATE POLICY "Tenant delete files" ON files FOR DELETE
USING (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
);

-- 2. Atualizar políticas RLS para file_folders (fallback para auth.uid())
DROP POLICY IF EXISTS "Tenant access folders" ON file_folders;

CREATE POLICY "Tenant access folders" ON file_folders FOR ALL
USING (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
)
WITH CHECK (
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
);

-- 3. Verificação: Contar arquivos acessíveis para o usuário atual
-- SELECT scope, COUNT(*) as count
-- FROM files 
-- WHERE tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text)
-- GROUP BY scope;
