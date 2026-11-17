-- Create short_urls table for URL shortening
CREATE TABLE public.short_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  user_id UUID,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  clicks INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_short_urls_short_code ON public.short_urls(short_code);
CREATE INDEX idx_short_urls_user_id ON public.short_urls(user_id);
CREATE INDEX idx_short_urls_business_id ON public.short_urls(business_id);

-- Enable RLS
ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

-- Allow public read for redirects (anyone can access short URLs)
CREATE POLICY "Short URLs are publicly readable" 
ON public.short_urls 
FOR SELECT 
USING (is_active = true);

-- Users can manage their own short URLs
CREATE POLICY "Users can create short URLs" 
ON public.short_urls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own short URLs" 
ON public.short_urls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own short URLs" 
ON public.short_urls 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create click tracking table
CREATE TABLE public.short_url_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_url_id UUID NOT NULL REFERENCES public.short_urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT
);

-- Enable RLS on clicks
ALTER TABLE public.short_url_clicks ENABLE ROW LEVEL SECURITY;

-- Allow insert for tracking (via edge function)
CREATE POLICY "Anyone can track clicks" 
ON public.short_url_clicks 
FOR INSERT 
WITH CHECK (true);

-- Users can view clicks on their URLs
CREATE POLICY "Users can view their URL clicks" 
ON public.short_url_clicks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.short_urls 
    WHERE short_urls.id = short_url_clicks.short_url_id 
    AND short_urls.user_id = auth.uid()
  )
);

-- Function to generate random short code
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_short_urls_updated_at
BEFORE UPDATE ON public.short_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();