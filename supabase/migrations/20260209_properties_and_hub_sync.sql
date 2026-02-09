
-- 🛡️ [PROPERTIES] Real Estate Portfolio Table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    price NUMERIC(15, 2) DEFAULT 0,
    bedrooms INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 🔐 RLS POLICIES for Properties
CREATE POLICY "Users can view their own tenant's properties" 
ON public.properties FOR SELECT 
USING (
    tenant_id = auth.uid() OR 
    (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com'
);

CREATE POLICY "Users can insert their own tenant's properties" 
ON public.properties FOR INSERT 
WITH CHECK (
    tenant_id = auth.uid() OR 
    (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com'
);

CREATE POLICY "Users can update their own tenant's properties" 
ON public.properties FOR UPDATE 
USING (
    tenant_id = auth.uid() OR 
    (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com'
);

CREATE POLICY "Users can delete their own tenant's properties" 
ON public.properties FOR DELETE 
USING (
    tenant_id = auth.uid() OR 
    (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com'
);

-- 📦 STORAGE for Property Images
-- Note: Buckets creation is usually done via API, but we specify policies here.
-- Assuming bucket 'properties_images' exists or will be created.

CREATE POLICY "Property Images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'properties_images');

CREATE POLICY "Users can upload property images to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'properties_images' AND 
    (auth.uid() = (storage.foldername(name))[1]::UUID OR 
     (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com')
);

CREATE POLICY "Users can delete their property images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'properties_images' AND 
    (auth.uid() = (storage.foldername(name))[1]::UUID OR 
     (auth.jwt() ->> 'email') = 'luminnus.lia.ai@gmail.com')
);

-- 🛰️ HUB HUB SYNC Table (Generic Webhook Logs)
CREATE TABLE IF NOT EXISTS public.hub_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- 'webhook', 'crm', 'external_db'
    event_type TEXT NOT NULL, -- 'sync_products', 'sync_properties', etc.
    payload JSONB,
    status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hub_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant's hub logs"
ON public.hub_logs FOR SELECT
USING (tenant_id = auth.uid());
