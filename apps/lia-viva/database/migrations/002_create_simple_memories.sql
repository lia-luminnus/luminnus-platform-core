-- ======================================================================
-- TABELA: memories - Memória Permanente Simplificada
-- ======================================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

-- RLS
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

-- Service role bypass (para backend com SERVICE_KEY)
CREATE POLICY "Service role full access"
  ON memories FOR ALL
  USING (true)
  WITH CHECK (true);
