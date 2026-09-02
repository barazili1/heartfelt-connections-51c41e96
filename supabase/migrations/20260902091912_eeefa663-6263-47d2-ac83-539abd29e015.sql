CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  player_id text NOT NULL,
  promo_image_url text NOT NULL,
  account_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  hardware_id text,
  stable_hardware_id text,
  telegram_id text
);

CREATE INDEX submissions_status_idx ON public.submissions (status);
CREATE UNIQUE INDEX submissions_player_id_unique_idx ON public.submissions (player_id);
CREATE UNIQUE INDEX submissions_hardware_id_unique_idx ON public.submissions (hardware_id) WHERE hardware_id IS NOT NULL;
CREATE UNIQUE INDEX submissions_stable_hardware_id_unique_idx ON public.submissions (stable_hardware_id) WHERE stable_hardware_id IS NOT NULL AND stable_hardware_id <> '';
CREATE UNIQUE INDEX submissions_telegram_id_unique_idx ON public.submissions (telegram_id) WHERE telegram_id IS NOT NULL AND telegram_id <> '';

GRANT SELECT, INSERT, UPDATE ON public.submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "public update submissions" ON public.submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public insert one locked submission"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  player_id ~ '^17[0-9]{7,10}$'
  AND device_id ~ '^([a-f0-9]{64}|and_[A-Za-z0-9]{6,64})$'
  AND hardware_id ~ '^([a-f0-9]{64}|and_[A-Za-z0-9]{6,64})$'
  AND stable_hardware_id ~ '^([a-f0-9]{64}|and_[A-Za-z0-9]{6,64})$'
  AND promo_image_url = device_id || '/promo'
  AND account_image_url = device_id || '/account'
  AND status = 'pending'
  AND reviewed_at IS NULL
);

CREATE OR REPLACE FUNCTION public.submissions_touch_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_touch_review_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.submissions_touch_review();

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

CREATE TRIGGER prevent_submission_identity_changes_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.prevent_submission_identity_changes();

CREATE TABLE public.admin_devices (
  fingerprint TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_devices TO anon;
GRANT SELECT, INSERT ON public.admin_devices TO authenticated;
GRANT ALL ON public.admin_devices TO service_role;

ALTER TABLE public.admin_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read admin devices" ON public.admin_devices FOR SELECT USING (true);
CREATE POLICY "public insert admin devices" ON public.admin_devices FOR INSERT WITH CHECK (true);

CREATE POLICY "anyone can read proofs" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'proofs');

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