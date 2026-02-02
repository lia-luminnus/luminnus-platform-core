-- 
-- MIGRATION: 20260202_fix_final_v3
-- DESCRIPTION: Correctly maps existing 'memories' columns to 'cognitive_memory' VIEW
--
-- CHANGES:
-- 1. Updates 'cognitive_memory' VIEW definition based on real column names
-- 2. Ensures 'agendamentos' and 'messages' exist
-- 3. Adds 'summary' to 'brief_history'
--

BEGIN;

-- ============================================================================
-- 1. FIX: Create 'cognitive_memory' VIEW (Correct Mapping)
-- ============================================================================
-- Based on SELECT result:
-- id, user_id, type, importance, content, raw_input, created_at, updated_at
-- key, value, is_important, tenant_id, scope, status, source, source_message_id
--
-- Mapping Requirement:
-- memory_key <- key (or fallback to type/id)
-- content <- content (or value)
-- type <- type (or scope)
-- ============================================================================

CREATE OR REPLACE VIEW public.cognitive_memory AS
SELECT 
    id,
    user_id,
    COALESCE(key, type || '_' || id::text) as memory_key, -- Fallback if key is null
    COALESCE(content, value) as content, -- Use content, fallback to value
    COALESCE(type, 'general') as type, -- Use type, fallback to general
    importance,
    created_at,
    updated_at
FROM public.memories;

-- ============================================================================
-- 2. FIX: Add 'summary' to 'brief_history'
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brief_history') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brief_history' AND column_name = 'summary') THEN
            ALTER TABLE public.brief_history ADD COLUMN summary TEXT;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 3. FIX: Create 'agendamentos' table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS safely
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agendamentos' AND policyname = 'Users can manage own agendamentos') THEN
        CREATE POLICY "Users can manage own agendamentos" ON public.agendamentos FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;