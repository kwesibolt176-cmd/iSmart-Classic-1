-- Add logo and banner columns to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS banner_url text;

-- Create storage bucket for business assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for business assets
CREATE POLICY "Users can upload their own business assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own business assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own business assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Business assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- Add daily_sales_summary_enabled to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS daily_sales_summary_enabled boolean DEFAULT false;