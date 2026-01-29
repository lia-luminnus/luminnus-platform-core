-- Migration: Create subscriptions table for Stripe subscription tracking
-- Date: 2026-01-21
-- Description: Table to track user subscriptions with Stripe, including 12-month commitment support

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe references
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT NOT NULL,
  
  -- Plan info
  plan_name TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('annual_full', 'annual_12x', 'monthly')),
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  
  -- Commitment tracking (for 12-month contracts)
  commitment_end_date TIMESTAMPTZ, -- NULL for monthly, date for 12x annual
  commitment_months INTEGER DEFAULT 0, -- 0 for monthly/full, 12 for annual_12x
  
  -- Stripe period info
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Cancellation
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_commitment ON subscriptions(commitment_end_date) WHERE commitment_end_date IS NOT NULL;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access"
  ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Add helper view for subscription status with commitment info
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  s.id,
  s.user_id,
  s.plan_name,
  s.payment_type,
  s.status,
  s.commitment_end_date,
  s.commitment_months,
  s.current_period_end,
  s.cancel_at_period_end,
  CASE 
    WHEN s.commitment_end_date IS NOT NULL AND s.commitment_end_date > NOW() 
    THEN TRUE 
    ELSE FALSE 
  END AS is_in_commitment,
  CASE 
    WHEN s.commitment_end_date IS NOT NULL AND s.commitment_end_date > NOW() 
    THEN EXTRACT(MONTH FROM AGE(s.commitment_end_date, NOW()))::INTEGER
    ELSE 0 
  END AS months_remaining_in_commitment,
  s.created_at
FROM subscriptions s
WHERE s.status = 'active';

-- Comments
COMMENT ON TABLE subscriptions IS 'Stripe subscription tracking with commitment support';
COMMENT ON COLUMN subscriptions.payment_type IS 'Type of payment: annual_full (paid upfront), annual_12x (monthly with 12mo commitment), monthly (no commitment)';
COMMENT ON COLUMN subscriptions.commitment_end_date IS 'End date of commitment period. NULL for monthly subscriptions without commitment.';
COMMENT ON COLUMN subscriptions.commitment_months IS 'Number of months of commitment. 0 for monthly, 12 for annual_12x';
