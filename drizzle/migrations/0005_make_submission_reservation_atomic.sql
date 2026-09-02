DROP POLICY IF EXISTS "one fixed proof pair per hardware" ON storage.objects;

CREATE POLICY "upload reserved proof pair only"
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

CREATE OR REPLACE FUNCTION public.prevent_submission_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.device_id IS DISTINCT FROM OLD.device_id
     OR NEW.hardware_id IS DISTINCT FROM OLD.hardware_id
     OR NEW.player_id IS DISTINCT FROM OLD.player_id
     OR NEW.promo_image_url IS DISTINCT FROM OLD.promo_image_url
     OR NEW.account_image_url IS DISTINCT FROM OLD.account_image_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Submission identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_submission_identity_changes_trg ON public.submissions;
CREATE TRIGGER prevent_submission_identity_changes_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.prevent_submission_identity_changes();