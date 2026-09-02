ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS hardware_id text;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_hardware_id_unique_idx
ON public.submissions (hardware_id)
WHERE hardware_id IS NOT NULL;

DROP POLICY IF EXISTS "one fixed proof pair per submission" ON storage.objects;

CREATE POLICY "one fixed proof pair per hardware"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'proofs'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND array_length(storage.foldername(name), 1) = 1
  AND storage.filename(name) IN ('promo', 'account')
  AND NOT EXISTS (
    SELECT 1
    FROM public.submissions s
    WHERE s.hardware_id = (storage.foldername(name))[1]
  )
);