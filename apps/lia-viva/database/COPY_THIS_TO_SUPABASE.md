# 🎯 COPIE E COLE NO SUPABASE SQL EDITOR

## 📋 Instruções:

1. Acesse: https://app.supabase.com
2. SQL Editor (menu lateral) → New Query
3. Copie TODO o conteúdo abaixo
4. Cole no editor
5. Clique em RUN (Ctrl+Enter)

---

## 🔽 SQL COMPLETO - COPIE ABAIXO DESTA LINHA:

```sql
-- ======================================================================
-- LIA DATABASE SCHEMA - Supabase
-- ======================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ======================================================================
-- TABELA: users
-- ======================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{
    "voicePersonality": "viva",
    "autoSave": true,
    "theme": "dark",
    "language": "pt-BR"
  }'::jsonb
);

CREATE INDEX idx_users_email ON users(email);

-- ======================================================================
-- TABELA: conversations
-- ======================================================================
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{
    "messageCount": 0,
    "voiceUsed": false,
    "searchUsed": 0,
    "sentiment": "neutral"
  }'::jsonb
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ======================================================================
-- TABELA: messages
-- ======================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ======================================================================
-- TABELA: function_calls
-- ======================================================================
CREATE TABLE function_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  arguments JSONB,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true
);

CREATE INDEX idx_function_calls_message_id ON function_calls(message_id);
CREATE INDEX idx_function_calls_conversation_id ON function_calls(conversation_id);
CREATE INDEX idx_function_calls_function_name ON function_calls(function_name);
CREATE INDEX idx_function_calls_created_at ON function_calls(created_at DESC);

-- ======================================================================
-- VIEWS
-- ======================================================================
CREATE VIEW user_conversation_stats AS
SELECT 
  u.id as user_id,
  u.name,
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages,
  COUNT(fc.id) as total_function_calls,
  MAX(c.updated_at) as last_conversation
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN function_calls fc ON c.id = fc.conversation_id
GROUP BY u.id, u.name;

CREATE VIEW recent_conversations AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.created_at,
  c.updated_at,
  c.metadata,
  (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
  (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at DESC LIMIT 1) as last_user_message,
  (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) as last_assistant_message
FROM conversations c
WHERE c.status = 'active'
ORDER BY c.updated_at DESC;

-- ======================================================================
-- FUNCTIONS
-- ======================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION search_similar_messages(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  message_id UUID,
  conversation_id TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    m.content,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM messages m
  WHERE m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view messages from own conversations" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert messages in own conversations" ON messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can view function_calls from own conversations" ON function_calls FOR SELECT USING (EXISTS (SELECT 1 FROM conversations WHERE id = function_calls.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert function_calls in own conversations" ON function_calls FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid()));

-- ======================================================================
-- DADOS INICIAIS
-- ======================================================================
INSERT INTO users (id, email, name, preferences) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@lia.local',
  'Desenvolvimento',
  '{"voicePersonality": "viva", "autoSave": true, "theme": "dark", "language": "pt-BR"}'::jsonb
);
```

---

## ✅ Depois de executar:

Execute o teste:
```bash
node test-supabase.js
```

Deve mostrar tudo verde! 🎉
