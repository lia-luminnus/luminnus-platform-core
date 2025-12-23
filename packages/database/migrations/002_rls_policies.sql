-- ============================================================
-- LUMINNUS PLATFORM CORE - Row Level Security Policies
-- ============================================================
-- IMPORTANT: These policies implement multi-tenant security.
-- Each user can only access data belonging to their company.
-- ============================================================

-- ============================================================
-- COMPANIES RLS
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users can view companies they are members of
CREATE POLICY IF NOT EXISTS "Users can view own companies"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Only owners can update company
CREATE POLICY IF NOT EXISTS "Owners can update companies"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================================
-- MEMBERSHIPS RLS
-- ============================================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can view memberships for companies they belong to
CREATE POLICY IF NOT EXISTS "View company memberships"
  ON memberships FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Admins/owners can manage memberships
CREATE POLICY IF NOT EXISTS "Admins can manage memberships"
  ON memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.company_id = memberships.company_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- CONVERSATIONS RLS
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can access their own conversations
CREATE POLICY IF NOT EXISTS "Users can access own conversations"
  ON conversations FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- MESSAGES RLS
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can access messages in their conversations
CREATE POLICY IF NOT EXISTS "Users can access own messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- SESSIONS RLS
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can access their own sessions
CREATE POLICY IF NOT EXISTS "Users can access own sessions"
  ON sessions FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- AUDIT_LOGS RLS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY IF NOT EXISTS "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.company_id = audit_logs.company_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- TOOL_INVOCATIONS RLS
-- ============================================================
ALTER TABLE tool_invocations ENABLE ROW LEVEL SECURITY;

-- Users can view their own tool invocations
CREATE POLICY IF NOT EXISTS "Users can view own tool invocations"
  ON tool_invocations FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- COMPANY_SETTINGS RLS
-- ============================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage company settings
CREATE POLICY IF NOT EXISTS "Admins can manage company settings"
  ON company_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.company_id = company_settings.company_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- PROFILES RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());
