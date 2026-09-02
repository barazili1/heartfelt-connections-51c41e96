CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  player_id text NOT NULL,
  promo_image_url text NOT NULL,
  account_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX submissions_status_idx ON public.submissions (status);

GRANT SELECT, INSERT, UPDATE ON public.submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "public insert submissions" ON public.submissions FOR INSERT WITH CHECK (
  player_id ~ '^17[0-9]{7,10}$'
);
CREATE POLICY "public update submissions" ON public.submissions FOR UPDATE USING (true) WITH CHECK (true);

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