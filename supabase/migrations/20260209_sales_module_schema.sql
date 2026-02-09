-- ============================================================
-- Sales Module Schema (Phase 1) - CORRIGIDO
-- Data: 2026-02-09
-- Description: Creates tables for Products, Orders, Order Items and Transactions
-- Fixes: DROP tables to avoid schema conflicts and explicit RLS casting
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ⚠️ WARNING: Dropping tables to ensure clean schema creation.
-- Ensure you don't have critical data in these tables before running.
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- ------------------------------------------------------------
-- 1. PRODUCTS (Estoque)
-- ------------------------------------------------------------
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT DEFAULT 'General',
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_products_sku ON public.products(sku);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant view products" ON public.products FOR SELECT
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

CREATE POLICY "Tenant manage products" ON public.products FOR ALL
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

-- ------------------------------------------------------------
-- 2. ORDERS (Vendas)
-- ------------------------------------------------------------
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant view orders" ON public.orders FOR SELECT
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

CREATE POLICY "Tenant manage orders" ON public.orders FOR ALL
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

-- ------------------------------------------------------------
-- 3. ORDER ITEMS (Itens da Venda)
-- ------------------------------------------------------------
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_tenant ON public.order_items(tenant_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant view order items" ON public.order_items FOR SELECT
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

CREATE POLICY "Tenant manage order items" ON public.order_items FOR ALL
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

-- ------------------------------------------------------------
-- 4. TRANSACTIONS (Financeiro Unificado)
-- ------------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'Uncategorized',
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'completed',
    related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant view transactions" ON public.transactions FOR SELECT
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);

CREATE POLICY "Tenant manage transactions" ON public.transactions FOR ALL
USING (
  (auth.jwt() ->> 'email' = 'luminnus.lia.ai@gmail.com') OR
  (auth.jwt() ->> 'email' LIKE '%@luminnus.lia.ai') OR
  (tenant_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), (auth.uid())::text))
);
