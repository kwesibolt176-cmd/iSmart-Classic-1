-- Create product images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow authenticated users to upload their own product images
CREATE POLICY "Users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own product images
CREATE POLICY "Users can view their own product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view all product images
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to update their own product images
CREATE POLICY "Users can update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own product images
CREATE POLICY "Users can delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);