
-- Create the thumbnails bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'Video Thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Set up public access policy for thumbnails bucket
CREATE POLICY "Public Access for Thumbnails" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'thumbnails');

-- Allow authenticated users to insert and update thumbnails
CREATE POLICY "Users can upload thumbnails" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Users can update their own thumbnails" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'thumbnails' AND auth.uid() = owner);
