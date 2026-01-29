-- ============================================================
-- Correção de folder_id para arquivos na raiz
-- Data: 2026-01-29
-- Problema: Arquivos de imagem estavam na raiz em vez da pasta "Imagens"
-- ============================================================

-- Buscar ID da pasta "Imagens" para o tenant principal
-- Nota: Substituir o tenant_id e folder_id pelos valores corretos do seu ambiente

-- Atualizar arquivos de imagem sem folder_id para a pasta "Imagens" correta
-- Atenção: Execute primeiro a query para descobrir o folder_id correto:
-- SELECT id, name FROM file_folders WHERE name = 'Imagens' AND scope = 'lia_shared';

-- Exemplo (substituir pelo ID real da pasta):
-- UPDATE files 
-- SET folder_id = 'PASTA_ID_AQUI'
-- WHERE scope = 'lia_shared' 
--   AND folder_id IS NULL
--   AND mime_type LIKE 'image/%'
--   AND tenant_id = 'TENANT_ID_AQUI';

-- Verificar arquivos ainda sem pasta
-- SELECT id, name, mime_type, storage_path
-- FROM files
-- WHERE scope = 'lia_shared' 
--   AND folder_id IS NULL
--   AND status = 'active';
