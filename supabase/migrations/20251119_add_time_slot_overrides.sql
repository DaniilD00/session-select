-- Table to manage manual overrides for booking availability
CREATE TABLE IF NOT EXISTS public.time_slot_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  time_slot VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_slot_overrides ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_slot_overrides_date_time
  ON public.time_slot_overrides(slot_date, time_slot);

CREATE POLICY "Anyone can read time slot overrides"
  ON public.time_slot_overrides
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages time slot overrides"
  ON public.time_slot_overrides
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
