-- ======================================================================
-- TABELA: memories - Sistema de Memória Persistente da LIA
-- ======================================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'personal',
    'family', 
    'company',
    'business',
    'preference',
    'address',
    'reminder',
    'misc'
  )),
  content TEXT NOT NULL,
  raw_input TEXT,
  importance INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes para performance
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_updated_at ON memories(updated_at DESC);

-- Index composto para queries otimizadas
CREATE INDEX idx_memories_user_importance ON memories(user_id, importance DESC, updated_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_memory_timestamp
BEFORE UPDATE ON memories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS para memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (user_id = auth.uid());

-- View para estatísticas de memórias
CREATE OR REPLACE VIEW memory_stats AS
SELECT 
  user_id,
  type,
  COUNT(*) as count,
  AVG(importance) as avg_importance,
  MAX(updated_at) as last_updated
FROM memories
GROUP BY user_id, type
ORDER BY user_id, count DESC;

COMMENT ON TABLE memories IS 'Armazena memórias importantes da LIA sobre usuários';
COMMENT ON COLUMN memories.type IS 'Categoria da memória: personal, family, company, business, preference, address, reminder, misc';
COMMENT ON COLUMN memories.content IS 'Conteúdo processado e estruturado da memória';
COMMENT ON COLUMN memories.raw_input IS 'Texto original do usuário que gerou esta memória';
COMMENT ON COLUMN memories.importance IS 'Nível de importância (1-10). Aumenta quando atualizada';
