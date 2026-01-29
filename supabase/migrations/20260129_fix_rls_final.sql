-- ============================================================
-- Correção Final de RLS e Suporte a Operações em Lote
-- Data: 2026-01-29
-- ============================================================

-- 1. Limpar políticas antigas
DROP POLICY IF EXISTS "Tenant view files" ON files;
DROP POLICY IF EXISTS "Tenant insert files" ON files;
DROP POLICY IF EXISTS "Tenant update files" ON files;
DROP POLICY IF EXISTS "Tenant delete files" ON files;

-- 2. Criar novas políticas com suporte a Admin e Flexibilidade de Tenant

-- SELECT: Mesmo tenant OU Admin
CREATE POLICY "Tenant view files" ON files FOR SELECT
USING (
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
  AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
);

-- INSERT: Mesmo tenant OU Admin
CREATE POLICY "Tenant insert files" ON files FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

-- UPDATE (Soft Delete): Mesmo tenant OU Admin
CREATE POLICY "Tenant update files" ON files FOR UPDATE
USING (
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (
    (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
    AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
  )
);

-- DELETE: Mesmo tenant OU Admin
CREATE POLICY "Tenant delete files" ON files FOR DELETE
USING (
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (
    (tenant_id::text = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
    AND (scope IN ('tenant_shared', 'lia_shared') OR owner_user_id = auth.uid())
  )
);
