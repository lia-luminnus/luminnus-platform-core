-- ============================================================
-- LUMiNNUS — FILE MANAGER (Supabase) — FULL FIXED SCHEMA + RLS
-- Resolve: dados inválidos impedindo CHECK (files_status_check)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1) CREATE TABLES (se não existirem)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  scope TEXT DEFAULT 'personal',
  parent_id UUID,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  scope TEXT DEFAULT 'personal',
  folder_id UUID,
  name TEXT,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  storage_bucket TEXT DEFAULT 'tenant-files',
  storage_path TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  source TEXT DEFAULT 'user_upload',
  source_ref TEXT,
  status TEXT DEFAULT 'active',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.file_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_id UUID,
  actor_user_id UUID,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2) PATCH LEGADO (ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- file_folders
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal';
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS path TEXT DEFAULT '/';
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- files
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'tenant-files';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user_upload';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS source_ref TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- file_events
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS file_id UUID;
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.file_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 3) FOREIGN KEYS (idempotente)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_folders_owner_user_id_fkey') THEN
    ALTER TABLE public.file_folders
      ADD CONSTRAINT file_folders_owner_user_id_fkey
      FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_folders_parent_id_fkey') THEN
    ALTER TABLE public.file_folders
      ADD CONSTRAINT file_folders_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.file_folders(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_owner_user_id_fkey') THEN
    ALTER TABLE public.files
      ADD CONSTRAINT files_owner_user_id_fkey
      FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_folder_id_fkey') THEN
    ALTER TABLE public.files
      ADD CONSTRAINT files_folder_id_fkey
      FOREIGN KEY (folder_id) REFERENCES public.file_folders(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_events_file_id_fkey') THEN
    ALTER TABLE public.file_events
      ADD CONSTRAINT file_events_file_id_fkey
      FOREIGN KEY (file_id) REFERENCES public.files(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_events_actor_user_id_fkey') THEN
    ALTER TABLE public.file_events
      ADD CONSTRAINT file_events_actor_user_id_fkey
      FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 4) NORMALIZAÇÃO FORÇADA (ANTES DOS CHECKS)
-- ============================================================

UPDATE public.files SET status = lower(trim(status)) WHERE status IS NOT NULL;
UPDATE public.files SET status = 'active' WHERE status IS NULL OR status NOT IN ('active','archived','deleted');
UPDATE public.files SET source = lower(trim(source)) WHERE source IS NOT NULL;
UPDATE public.files SET source = 'user_upload' WHERE source IS NULL OR source NOT IN ('user_upload','lia_attachment','lia_generated','system');
UPDATE public.files SET scope = lower(trim(scope)) WHERE scope IS NOT NULL;
UPDATE public.files SET scope = 'personal' WHERE scope IS NULL OR scope NOT IN ('personal','tenant_shared','lia_shared');
UPDATE public.file_folders SET scope = lower(trim(scope)) WHERE scope IS NOT NULL;
UPDATE public.file_folders SET scope = 'personal' WHERE scope IS NULL OR scope NOT IN ('personal','tenant_shared','lia_shared');
UPDATE public.files SET storage_bucket = 'tenant-files' WHERE storage_bucket IS NULL OR trim(storage_bucket) = '';

DO $$
BEGIN
  UPDATE public.files
  SET name = COALESCE(
    NULLIF(original_name, ''),
    NULLIF(regexp_replace(COALESCE(storage_path, ''), '^.*/', ''), ''),
    'arquivo_sem_nome'
  )
  WHERE name IS NULL OR trim(name) = '';

  UPDATE public.files
  SET original_name = COALESCE(
    NULLIF(name, ''),
    NULLIF(regexp_replace(COALESCE(storage_path, ''), '^.*/', ''), '')
  )
  WHERE original_name IS NULL OR trim(original_name) = '';
END $$;

-- ============================================================
-- 5) CHECK CONSTRAINTS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_folders_scope_check') THEN
    ALTER TABLE public.file_folders ADD CONSTRAINT file_folders_scope_check CHECK (scope IN ('personal','tenant_shared','lia_shared'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_scope_check') THEN
    ALTER TABLE public.files ADD CONSTRAINT files_scope_check CHECK (scope IN ('personal','tenant_shared','lia_shared'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_source_check') THEN
    ALTER TABLE public.files ADD CONSTRAINT files_source_check CHECK (source IN ('user_upload','lia_attachment','lia_generated','system'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_status_check') THEN
    ALTER TABLE public.files ADD CONSTRAINT files_status_check CHECK (status IN ('active','archived','deleted'));
  END IF;
END $$;

-- ============================================================
-- 6) ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_files_tenant_folder ON public.files (tenant_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant_owner ON public.files (tenant_id, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant_scope ON public.files (tenant_id, scope);
CREATE INDEX IF NOT EXISTS idx_folders_tenant_parent ON public.file_folders (tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_tenant_scope ON public.file_folders (tenant_id, scope);
CREATE INDEX IF NOT EXISTS idx_events_tenant_file ON public.file_events (tenant_id, file_id);

-- ============================================================
-- 7) RLS ENABLE
-- ============================================================

ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8) RLS POLICIES (completas)
-- ============================================================

-- file_folders
DROP POLICY IF EXISTS "Tenant view folders" ON public.file_folders;
CREATE POLICY "Tenant view folders" ON public.file_folders FOR SELECT USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant insert folders" ON public.file_folders;
CREATE POLICY "Tenant insert folders" ON public.file_folders FOR INSERT WITH CHECK (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (owner_user_id IS NULL OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant update folders" ON public.file_folders;
CREATE POLICY "Tenant update folders" ON public.file_folders FOR UPDATE USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid())) WITH CHECK (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant delete folders" ON public.file_folders;
CREATE POLICY "Tenant delete folders" ON public.file_folders FOR DELETE USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

-- files
DROP POLICY IF EXISTS "Tenant view files" ON public.files;
CREATE POLICY "Tenant view files" ON public.files FOR SELECT USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant insert files" ON public.files;
CREATE POLICY "Tenant insert files" ON public.files FOR INSERT WITH CHECK (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (owner_user_id IS NULL OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant update files" ON public.files;
CREATE POLICY "Tenant update files" ON public.files FOR UPDATE USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid())) WITH CHECK (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant delete files" ON public.files;
CREATE POLICY "Tenant delete files" ON public.files FOR DELETE USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (scope IN ('tenant_shared','lia_shared') OR owner_user_id = auth.uid()));

-- file_events
DROP POLICY IF EXISTS "Tenant view file events" ON public.file_events;
CREATE POLICY "Tenant view file events" ON public.file_events FOR SELECT USING (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid));

DROP POLICY IF EXISTS "Tenant insert file events" ON public.file_events;
CREATE POLICY "Tenant insert file events" ON public.file_events FOR INSERT WITH CHECK (tenant_id = (NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid) AND (actor_user_id IS NULL OR actor_user_id = auth.uid()));

-- ============================================================
-- 9) STORAGE POLICY (bucket tenant-files)
-- ============================================================

DROP POLICY IF EXISTS "Tenant Storage Access" ON storage.objects;

CREATE POLICY "Tenant Storage Access" ON storage.objects
FOR ALL
USING (
  bucket_id = 'tenant-files'
  AND (storage.foldername(name))[1] = 'tenant'
  AND (storage.foldername(name))[2] = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
)
WITH CHECK (
  bucket_id = 'tenant-files'
  AND (storage.foldername(name))[1] = 'tenant'
  AND (storage.foldername(name))[2] = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
);
