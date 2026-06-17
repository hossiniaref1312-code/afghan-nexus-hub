
CREATE POLICY "Public read listing images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-images');

CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
