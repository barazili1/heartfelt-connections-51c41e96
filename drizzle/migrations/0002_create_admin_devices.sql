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