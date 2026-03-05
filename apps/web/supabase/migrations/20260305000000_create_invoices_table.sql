-- Migration: Create invoices table for Stripe Billing sync
-- Date: 2026-03-05
-- Description: Standardizes the invoices table to match Stripe webhook data and frontend expectations.

CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY, -- Stripe Invoice ID (in_...)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id TEXT, -- Stripe Customer ID (cus_...)
  subscription_id TEXT, -- Stripe Subscription ID (sub_...)
  amount_paid INTEGER, -- Amount in cents
  currency TEXT,
  status TEXT,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own invoices" ON public.invoices;
CREATE POLICY "Users can read own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members 
      WHERE tenant_members.tenant_id = invoices.tenant_id 
      AND tenant_members.user_id = auth.uid()
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access invoices" ON public.invoices;
CREATE POLICY "Service role full access invoices"
  ON public.invoices
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON public.invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();
