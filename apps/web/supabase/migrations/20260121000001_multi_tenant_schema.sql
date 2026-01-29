-- Migration: Multi-Tenant Schema
-- Date: 2026-01-21
-- Description: Establishes profiles, tenants, and tenant_members tables. Links subscriptions to tenants.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  timezone TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop type if it exists and recreate
DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Refactor subscriptions to be tenant-linked
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'tenant_id') THEN
      ALTER TABLE subscriptions ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
  ELSE
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id),
      stripe_subscription_id TEXT,
      stripe_customer_id TEXT,
      stripe_price_id TEXT,
      plan_name TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      status TEXT NOT NULL,
      commitment_end_date TIMESTAMPTZ,
      commitment_months INTEGER,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      canceled_at TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN DEFAULT false,
      cancellation_reason TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Enable RLS on all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for tenants
DROP POLICY IF EXISTS "Tenants are viewable by members" ON tenants;
CREATE POLICY "Tenants are viewable by members" ON tenants FOR SELECT
  USING (EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = tenants.id AND user_id = auth.uid()));

-- Policies for tenant_members
DROP POLICY IF EXISTS "Members can view fellow members" ON tenant_members;
CREATE POLICY "Members can view fellow members" ON tenant_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM tenant_members m WHERE m.tenant_id = tenant_members.tenant_id AND m.user_id = auth.uid()));

-- Policies for subscriptions
DROP POLICY IF EXISTS "Subscriptions are viewable by tenant members" ON subscriptions;
CREATE POLICY "Subscriptions are viewable by tenant members" ON subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = subscriptions.tenant_id AND user_id = auth.uid()));

-- Trigger for Profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
