DROP POLICY IF EXISTS "Public read listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users update own files" ON storage.objects;

CREATE POLICY "Read images of visible listings" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-images'
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id::text = (storage.foldername(name))[2]
      AND l.user_id::text = (storage.foldername(name))[1]
      AND (
        l.status = 'active'
        OR l.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);