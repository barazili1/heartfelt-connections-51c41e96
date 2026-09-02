ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS stable_hardware_id text,
ADD COLUMN IF NOT EXISTS telegram_id text;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_stable_hardware_id_unique_idx
ON public.submissions (stable_hardware_id)
WHERE stable_hardware_id IS NOT NULL AND stable_hardware_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS submissions_telegram_id_unique_idx
ON public.submissions (telegram_id)
WHERE telegram_id IS NOT NULL AND telegram_id <> '';

DROP POLICY IF EXISTS "public insert submissions" ON public.submissions;
CREATE POLICY "public insert one locked submission"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  player_id ~ '^17[0-9]{7,10}$'
  AND device_id ~ '^[a-f0-9]{64}$'
  AND hardware_id ~ '^[a-f0-9]{64}$'
  AND stable_hardware_id ~ '^[a-f0-9]{64}$'
  AND promo_image_url = device_id || '/promo'
  AND account_image_url = device_id || '/account'
  AND status = 'pending'
  AND reviewed_at IS NULL
);

CREATE OR REPLACE FUNCTION public.prevent_submission_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.device_id IS DISTINCT FROM OLD.device_id
     OR NEW.hardware_id IS DISTINCT FROM OLD.hardware_id
     OR NEW.stable_hardware_id IS DISTINCT FROM OLD.stable_hardware_id
     OR NEW.telegram_id IS DISTINCT FROM OLD.telegram_id
     OR NEW.player_id IS DISTINCT FROM OLD.player_id
     OR NEW.promo_image_url IS DISTINCT FROM OLD.promo_image_url
     OR NEW.account_image_url IS DISTINCT FROM OLD.account_image_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Submission identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;