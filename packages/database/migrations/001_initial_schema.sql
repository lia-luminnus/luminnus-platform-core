-- ============================================================
-- LUMINNUS PLATFORM CORE - Database Schema
-- ============================================================
-- IMPORTANT: This is an INCREMENTAL schema.
-- It uses CREATE TABLE IF NOT EXISTS and will NOT drop existing tables.
-- Safe to run against existing Supabase instances.
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLANS TABLE
-- Defines the subscription plans: Start, Plus, Pro
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  modes TEXT[] DEFAULT '{}',
  max_users INTEGER DEFAULT 1,
  max_storage_mb INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans if they don't exist
INSERT INTO plans (id, name, description, price_monthly, modes, max_users, max_storage_mb)
VALUES 
  ('start', 'Start', 'Plano básico com chat', 0, ARRAY['chat'], 1, 100),
  ('plus', 'Plus', 'Plano com multimodal', 99, ARRAY['chat', 'multimodal'], 5, 500),
  ('pro', 'Pro', 'Plano completo com live', 199, ARRAY['chat', 'multimodal', 'live'], 20, 2000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANIES TABLE (Tenants)
-- Each company is a separate tenant with their own data
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan_id TEXT REFERENCES plans(id) DEFAULT 'start',
  owner_id UUID,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEMBERSHIPS TABLE
-- Links users to companies with roles
-- ============================================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON memberships(company_id);

-- ============================================================
-- ENTITLEMENTS TABLE
-- Features available per plan
-- ============================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  description TEXT,
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_id, feature)
);

-- Insert default entitlements
INSERT INTO entitlements (plan_id, feature, description) VALUES
  -- Start plan
  ('start', 'chat', 'Basic chat with LIA'),
  ('start', 'basic_calendar', 'Basic calendar integration'),
  -- Plus plan
  ('plus', 'chat', 'Basic chat with LIA'),
  ('plus', 'multimodal', 'Image, file, and screen analysis'),
  ('plus', 'files', 'File upload and management'),
  ('plus', 'calendar', 'Full calendar integration'),
  ('plus', 'reports', 'Basic reports'),
  -- Pro plan
  ('pro', 'chat', 'Basic chat with LIA'),
  ('pro', 'multimodal', 'Image, file, and screen analysis'),
  ('pro', 'live', 'Real-time voice and video'),
  ('pro', 'files', 'File upload and management'),
  ('pro', 'calendar', 'Full calendar integration'),
  ('pro', 'reports', 'Advanced reports'),
  ('pro', 'automations', 'Workflow automations'),
  ('pro', 'advanced_reports', 'Advanced analytics'),
  ('pro', 'api_access', 'API access for integrations')
ON CONFLICT (plan_id, feature) DO NOTHING;

-- ============================================================
-- AUDIT_LOGS TABLE
-- Tracks sensitive actions for compliance
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- CONVERSATIONS TABLE
-- Chat/multimodal/live sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'chat',
  title TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);

-- ============================================================
-- MESSAGES TABLE
-- Individual messages in conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================================
-- SESSIONS TABLE
-- Active user sessions for real-time features
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mode TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id) WHERE ended_at IS NULL;

-- ============================================================
-- TOOL_INVOCATIONS TABLE
-- Tracks LIA tool/function calls for auditing
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_conversation ON tool_invocations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_company ON tool_invocations(company_id);

-- ============================================================
-- COMPANY_SETTINGS TABLE
-- Per-company configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings ON company_settings(company_id);

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
