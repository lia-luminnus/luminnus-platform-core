-- ======================================================================
-- TABELA: messages (Atualização)
-- ======================================================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS origin text DEFAULT 'text';

-- ======================================================================
-- TABELA: memories (Memória Persistente da LIA)
-- ======================================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- Tipos possíveis:
  -- personal, family, preference, business, company, address, reminder, misc

  importance INTEGER DEFAULT 1,
  -- 1 = fraca, 2 = média, 3 = forte
  -- A LIA aumenta isso automaticamente quando o cliente repete a informação

  content TEXT NOT NULL,
  -- A informação normalizada/limpa que será armazenada

  raw_input TEXT,
  -- O texto original do usuário que gerou essa memória

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);

-- Trigger para updated_at
CREATE TRIGGER update_memories_timestamp
AFTER UPDATE ON memories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
