-- SCRIPT DE LIMPEZA DE TABELAS REDUNDANTES (OPCIONAL)
-- Execute este script para remover tabelas vazias que estão apenas poluindo o banco de dados.

-- 1. Remover tabelas de conversas redundantes (0 linhas)
DROP TABLE IF EXISTS public.conversas CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;

-- 2. Remover tabelas de mensagens redundantes (0 linhas)
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.admin_chat_messages CASCADE;

-- 3. Remover tabelas de memória redundantes (0 linhas)
DROP TABLE IF EXISTS public.chat_memory CASCADE;

-- NOTA: As tabelas a seguir serão MANTIDAS pois possuem dados ou lógica ativa:
-- - public.conversations  (14 linhas - ATIVA v4)
-- - public.messages       (3340 linhas - ATIVA v4)
-- - public.memories       (43 linhas - ATIVA v4)
-- - public.memories_v2    (8 linhas - RECENTE)
-- - public.profiles       (Ativa - Autenticação)
