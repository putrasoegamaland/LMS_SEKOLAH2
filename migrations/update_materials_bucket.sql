-- Make sure the bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'materials';

-- Update allowed MIME types to support video
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/png', 
    'image/jpeg', 
    'image/gif', 
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/ogg'
]
WHERE id = 'materials';

-- Re-create policies (Drop first to avoid 'already exists' error)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Create policies again
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'materials' );

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'materials' );
