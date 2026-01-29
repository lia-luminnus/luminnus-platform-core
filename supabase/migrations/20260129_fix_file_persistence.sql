-- ============================================================
-- Correção de Persistência de Arquivos e Políticas de Storage
-- Data: 2026-01-29
-- Problema: Arquivos não apareciam na aba "Arquivos da LIA" 
--           devido a scope incorreto e bucket privado
-- ============================================================

-- 1) Tornar bucket tenant-files público para leitura
UPDATE storage.buckets 
SET public = true 
WHERE name = 'tenant-files';

-- 2) Criar política de leitura pública para o bucket
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;

CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'tenant-files');

-- 3) Manter política de escrita autenticada (já existe via "Tenant Storage Access")
-- A política "Tenant Storage Access" já controla INSERT/UPDATE/DELETE

-- 4) Corrigir scope de arquivos existentes que foram processados via chat da LIA
UPDATE files 
SET scope = 'lia_shared'
WHERE parse_method LIKE 'multimodal_orchestrator%'
  AND scope = 'personal'
  AND source = 'user_upload'
  AND status = 'active';

-- 5) Verificação: Contar arquivos corrigidos
SELECT 
  scope,
  COUNT(*) as count
FROM files 
WHERE status = 'active' 
  AND parse_method LIKE 'multimodal_orchestrator%'
GROUP BY scope;
