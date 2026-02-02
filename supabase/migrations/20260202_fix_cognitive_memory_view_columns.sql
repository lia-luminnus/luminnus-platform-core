-- 
-- MIGRATION: 20260202_fix_cognitive_memory_view_columns
-- DESCRIPTION: Aligns cognitive_memory view columns with backend expectations
--
-- FIXES:
-- error: column cognitive_memory.key does not exist
--
-- CHANGES:
-- 1. Redefines 'cognitive_memory' VIEW to include both 'key' and 'memory_key' alias
--

BEGIN;

CREATE OR REPLACE VIEW public.cognitive_memory AS
SELECT 
    id,
    user_id,
    -- Expose 'key' for backward compatibility (backend expects this)
    COALESCE(key, type || '_' || id::text) as key,
    -- Expose 'memory_key' for forward compatibility
    COALESCE(key, type || '_' || id::text) as memory_key,
    COALESCE(content, value) as content,
    COALESCE(type, 'general') as type,
    importance,
    created_at,
    updated_at
FROM public.memories;

COMMIT;