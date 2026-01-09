-- ============================================
-- FIX STORAGE RLS: Permitir uploads no bucket user-files
-- ============================================
-- O bucket existe e é público, mas as políticas de
-- storage.objects estão bloqueando o upload (403)
-- ============================================

-- 1. Remover políticas antigas do bucket (se existirem)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "user-files-upload" ON storage.objects;
DROP POLICY IF EXISTS "user-files-download" ON storage.objects;

-- 2. Criar política para UPLOAD (INSERT)
CREATE POLICY "Allow all uploads to user-files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'user-files');

-- 3. Criar política para DOWNLOAD (SELECT)
CREATE POLICY "Allow all downloads from user-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-files');

-- 4. Criar política para UPDATE (se precisar sobrescrever)
CREATE POLICY "Allow all updates to user-files"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'user-files');

-- 5. Criar política para DELETE
CREATE POLICY "Allow all deletes from user-files"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'user-files');

-- ============================================
-- Após executar, reinicie o servidor e teste novamente
-- ============================================
