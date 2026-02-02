-- ==========================================================
-- VERIFICATION SCRIPT: Check Database Schema
-- Date: 2026-02-02
-- Description: Verify existence of required tables and columns
-- ==========================================================

\echo '========================================='
\echo 'DATABASE SCHEMA VERIFICATION'
\echo '========================================='
\echo ''

-- ==========================================================
-- 1. CHECK TABLES EXISTENCE
-- ==========================================================
\echo '1. Checking table existence...'
\echo ''

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'conversations')
        THEN '✓ conversations table exists'
        ELSE '✗ conversations table MISSING'
    END AS check_conversations;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'messages')
        THEN '✓ messages table exists'
        ELSE '✗ messages table MISSING'
    END AS check_messages;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'memories')
        THEN '✓ memories table exists'
        ELSE '✗ memories table MISSING'
    END AS check_memories;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views 
                     WHERE table_schema = 'public' AND table_name = 'cognitive_memory')
        THEN '✓ cognitive_memory view exists'
        ELSE '✗ cognitive_memory view MISSING'
    END AS check_cognitive_memory;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'agendamentos')
        THEN '✓ agendamentos table exists'
        ELSE '✗ agendamentos table MISSING'
    END AS check_agendamentos;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'brief_history')
        THEN '✓ brief_history table exists'
        ELSE '✗ brief_history table MISSING'
    END AS check_brief_history;

\echo ''
\echo '========================================='
\echo '2. Checking critical columns...'
\echo ''

-- Check brief_history.summary column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'brief_history' 
            AND column_name = 'summary'
        )
        THEN '✓ brief_history.summary column exists'
        ELSE '✗ brief_history.summary column MISSING'
    END AS check_summary_column;

-- Check memories.key column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'memories' 
            AND column_name = 'key'
        )
        THEN '✓ memories.key column exists'
        ELSE '✗ memories.key column MISSING'
    END AS check_memories_key;

-- Check cognitive_memory.importance column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'cognitive_memory' 
            AND column_name = 'importance'
        )
        THEN '✓ cognitive_memory.importance column exists'
        ELSE '✗ cognitive_memory.importance column MISSING'
    END AS check_cognitive_importance;

\echo ''
\echo '========================================='
\echo '3. Table schema details...'
\echo ''

-- Show conversations table structure
\echo 'conversations table structure:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'conversations'
ORDER BY ordinal_position;

\echo ''
\echo 'messages table structure:'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

\echo ''
\echo 'memories table structure:'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'memories'
ORDER BY ordinal_position;

\echo ''
\echo 'agendamentos table structure:'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'agendamentos'
ORDER BY ordinal_position;

\echo ''
\echo '========================================='
\echo '4. RLS Policies check...'
\echo ''

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ Disabled' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'memories', 'agendamentos', 'brief_history')
ORDER BY tablename;

\echo ''
\echo '========================================='
\echo '5. Indexes check...'
\echo ''

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'memories', 'agendamentos')
ORDER BY tablename, indexname;

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='
