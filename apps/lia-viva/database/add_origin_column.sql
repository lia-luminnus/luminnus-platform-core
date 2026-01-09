-- ============================================================
-- ADICIONAR COLUNA origin NA TABELA messages
-- ============================================================
-- Este script adiciona a coluna 'origin' para rastrear se a
-- mensagem veio do chat de texto ou da voz (WebRTC)
-- ============================================================

-- 1. Adicionar coluna origin (se não existir)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'text';

-- 2. Criar índice para performance em consultas filtradas por origem
CREATE INDEX IF NOT EXISTS idx_messages_origin ON messages(origin);

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN messages.origin IS 'Origem da mensagem: text (chat) ou voice (WebRTC)';

-- 4. IMPORTANTE: Recarregar schema cache do Supabase
-- Isso força o Supabase a reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICAÇÃO (opcional)
-- ============================================================
-- Descomente as linhas abaixo se quiser verificar que funcionou:

-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'messages' 
-- AND column_name = 'origin';

-- ============================================================
-- PRONTO! 
-- ============================================================
-- Agora a LIA vai conseguir:
-- ✅ Salvar mensagens com origem (text ou voice)
-- ✅ Diferenciar conversas por chat e voz
-- ✅ Manter memória unificada funcionando perfeitamente
-- ============================================================
