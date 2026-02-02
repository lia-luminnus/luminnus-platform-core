-- 
-- MIGRATION: 20260202_fix_profiles_rls_policies
-- DESCRIPTION: Adds RLS policies to profiles table to allow users to manage their own profile
-- 
-- PROBLEM: The profiles table has RLS enabled but NO policies, causing all UPDATE/INSERT to fail silently.
-- This results in onboarding_completed never being saved to the database.
--
-- CHANGES:
-- 1. Drops any existing conflicting policies
-- 2. Creates SELECT/INSERT/UPDATE/DELETE policies for authenticated users on their own profile
-- 3. Ensures users can read and update their own onboarding_completed status
--

BEGIN;

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Policy 1: Users can SELECT their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

-- Policy 2: Users can INSERT their own profile (for first-time users)
CREATE POLICY "Users can insert own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy 3: Users can UPDATE their own profile (CRITICAL for onboarding_completed)
CREATE POLICY "Users can update own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 4: Users can DELETE their own profile (for account deletion)
CREATE POLICY "Users can delete own profile" 
    ON public.profiles 
    FOR DELETE 
    USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

COMMIT;

-- VERIFICATION QUERY (run after migration):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
