-- ==========================================================
-- Migration: Fix Missing Tables and Columns
-- Date: 2026-02-02
-- Description: 
--   1. Create cognitive_memory table (alias/view for memories)
--   2. Add missing summary column to brief_history
--   3. Ensure agendamentos table exists in main schema
--   4. Create conversations and messages tables if missing
-- ==========================================================

-- ==========================================================
-- 1. CONVERSATIONS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT,
    mode TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
    ON public.conversations(user_id, updated_at DESC);

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================================
-- 2. MESSAGES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'system_summary')),
    content TEXT NOT NULL,
    origin TEXT DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) 
        REFERENCES public.conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
    ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_role 
    ON public.messages(role, created_at DESC);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
CREATE POLICY "Users can view messages in own conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON public.messages;
CREATE POLICY "Users can insert messages in own conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- ==========================================================
-- 3. MEMORIES TABLE (if not exists)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    key TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'misc',
    importance INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
    source TEXT DEFAULT 'inferred',
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_memories_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT uq_memories_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id 
    ON public.memories(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_importance 
    ON public.memories(importance DESC, updated_at DESC);

-- RLS Policies
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memories" ON public.memories;
CREATE POLICY "Users can view own memories"
    ON public.memories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own memories" ON public.memories;
CREATE POLICY "Users can insert own memories"
    ON public.memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own memories" ON public.memories;
CREATE POLICY "Users can update own memories"
    ON public.memories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own memories" ON public.memories;
CREATE POLICY "Users can delete own memories"
    ON public.memories FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================================
-- 4. COGNITIVE_MEMORY VIEW/TABLE
--    Create as a view that points to memories table
-- ==========================================================
DROP VIEW IF EXISTS public.cognitive_memory CASCADE;

CREATE VIEW public.cognitive_memory AS
SELECT 
    id,
    user_id,
    key,
    content,
    type,
    importance,
    status,
    source,
    tenant_id,
    created_at,
    updated_at
FROM public.memories
WHERE status = 'active';

COMMENT ON VIEW public.cognitive_memory IS 'Alias view for memories table - used by assistant API';

-- Grant permissions to view
GRANT SELECT ON public.cognitive_memory TO authenticated;
GRANT SELECT ON public.cognitive_memory TO anon;

-- ==========================================================
-- 5. AGENDAMENTOS TABLE (if not exists in main schema)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    titulo TEXT NOT NULL,
    data DATE NOT NULL,
    hora TIME,
    descricao TEXT,
    status TEXT CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')) DEFAULT 'pendente',
    criado_em TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_agendamentos_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id_data 
    ON public.agendamentos(user_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status 
    ON public.agendamentos(status, data);

-- RLS Policies
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can view own agendamentos"
    ON public.agendamentos FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can insert own agendamentos"
    ON public.agendamentos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can update own agendamentos"
    ON public.agendamentos FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own agendamentos" ON public.agendamentos;
CREATE POLICY "Users can delete own agendamentos"
    ON public.agendamentos FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================================
-- 6. ADD MISSING SUMMARY COLUMN TO BRIEF_HISTORY
-- ==========================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'brief_history') THEN
        
        -- Add summary column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'brief_history' 
            AND column_name = 'summary'
        ) THEN
            ALTER TABLE public.brief_history 
            ADD COLUMN summary TEXT;
            
            COMMENT ON COLUMN public.brief_history.summary IS 
                'Executive summary text extracted from content for quick insights';
            
            RAISE NOTICE 'Added summary column to brief_history table';
        ELSE
            RAISE NOTICE 'Summary column already exists in brief_history table';
        END IF;
    ELSE
        RAISE NOTICE 'brief_history table does not exist - skipping summary column addition';
    END IF;
END $$;

-- ==========================================================
-- 7. CREATE UPDATE TRIGGER FUNCTION (if not exists)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_memories_updated_at ON public.memories;
CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON public.memories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON public.agendamentos;
CREATE TRIGGER update_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================================
-- 8. VERIFICATION COMMENTS
-- ==========================================================
COMMENT ON TABLE public.conversations IS 'User conversations with the LIA assistant';
COMMENT ON TABLE public.messages IS 'Messages within conversations - supports text, voice, and multimodal';
COMMENT ON TABLE public.memories IS 'Long-term memory storage for user context and preferences';
COMMENT ON TABLE public.agendamentos IS 'User appointments and scheduled tasks';

-- ==========================================================
-- MIGRATION COMPLETE
-- ==========================================================
-- Summary of changes:
-- ✓ Created conversations table (if missing)
-- ✓ Created messages table (if missing)
-- ✓ Created memories table (if missing)
-- ✓ Created cognitive_memory view as alias for memories
-- ✓ Created agendamentos table (if missing)
-- ✓ Added summary column to brief_history (if table exists)
-- ✓ Added RLS policies for all tables
-- ✓ Added indexes for performance
-- ✓ Added update triggers
-- ==========================================================
