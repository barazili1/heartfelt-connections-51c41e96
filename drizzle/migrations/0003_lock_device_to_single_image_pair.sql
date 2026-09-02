CREATE UNIQUE INDEX IF NOT EXISTS submissions_player_id_unique_idx
ON public.submissions (player_id);

DROP POLICY IF EXISTS "anyone can upload proofs" ON storage.objects;

CREATE POLICY "one fixed proof pair per submission"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'proofs'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND array_length(storage.foldername(name), 1) = 1
  AND storage.filename(name) IN ('promo', 'account')
  AND EXISTS (
    SELECT 1
    FROM public.submissions s
    WHERE s.device_id = (storage.foldername(name))[1]
      AND s.promo_image_url = s.device_id || '/promo'
      AND s.account_image_url = s.device_id || '/account'
  )
);