-- =====================================================================
-- Ronneby location: parallel tables mirroring the Solna schema.
--
-- Structure (columns, defaults, generated columns, CHECK constraints,
-- indexes, primary key) is cloned with LIKE ... INCLUDING ALL.
-- RLS policies, triggers, foreign keys and table/column GRANTs are NOT
-- copied by LIKE, so they are recreated explicitly below to reproduce the
-- exact same security model as the Solna tables.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- =====================================================================
-- bookings_ronneby  (mirrors public.bookings)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.bookings_ronneby (LIKE public.bookings INCLUDING ALL);

-- Foreign key to auth.users (LIKE never copies foreign keys)
DO $$ BEGIN
  ALTER TABLE public.bookings_ronneby
    ADD CONSTRAINT bookings_ronneby_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings_ronneby ENABLE ROW LEVEL SECURITY;

-- Public can read only the availability columns; all writes go through the
-- service role (edge functions), which bypasses RLS. Mirrors 20251120 + 20260223.
REVOKE SELECT ON public.bookings_ronneby FROM anon, authenticated;
GRANT SELECT (booking_date, time_slot, payment_status) ON public.bookings_ronneby TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bookings_ronneby FROM anon, authenticated;

DROP POLICY IF EXISTS "Public availability check" ON public.bookings_ronneby;
CREATE POLICY "Public availability check"
  ON public.bookings_ronneby FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_bookings_ronneby_updated_at ON public.bookings_ronneby;
CREATE TRIGGER update_bookings_ronneby_updated_at
  BEFORE UPDATE ON public.bookings_ronneby
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mirror the realtime publication so the booking calendar gets live updates
-- (matches the Solna bookings table). Ignored if already added.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings_ronneby;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- =====================================================================
-- time_slot_overrides_ronneby  (mirrors public.time_slot_overrides)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.time_slot_overrides_ronneby (LIKE public.time_slot_overrides INCLUDING ALL);

ALTER TABLE public.time_slot_overrides_ronneby ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read time slot overrides" ON public.time_slot_overrides_ronneby;
CREATE POLICY "Anyone can read time slot overrides"
  ON public.time_slot_overrides_ronneby FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages time slot overrides" ON public.time_slot_overrides_ronneby;
CREATE POLICY "Service role manages time slot overrides"
  ON public.time_slot_overrides_ronneby FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================================
-- waitlist_ronneby  (mirrors public.waitlist)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.waitlist_ronneby (LIKE public.waitlist INCLUDING ALL);

ALTER TABLE public.waitlist_ronneby ENABLE ROW LEVEL SECURITY;

-- Public can subscribe (INSERT) but not read; service role manages the rest.
REVOKE SELECT ON public.waitlist_ronneby FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can subscribe to waitlist" ON public.waitlist_ronneby;
CREATE POLICY "Anyone can subscribe to waitlist"
  ON public.waitlist_ronneby FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update waitlist" ON public.waitlist_ronneby;
CREATE POLICY "Service role can update waitlist"
  ON public.waitlist_ronneby FOR UPDATE USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS update_waitlist_ronneby_updated_at ON public.waitlist_ronneby;
CREATE TRIGGER update_waitlist_ronneby_updated_at
  BEFORE UPDATE ON public.waitlist_ronneby
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- reviews_ronneby  (mirrors public.reviews)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reviews_ronneby (LIKE public.reviews INCLUDING ALL);

-- Foreign key points at the Ronneby bookings table.
DO $$ BEGIN
  ALTER TABLE public.reviews_ronneby
    ADD CONSTRAINT reviews_ronneby_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings_ronneby(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.reviews_ronneby ENABLE ROW LEVEL SECURITY;

-- Service-role only (read + write via edge functions).
REVOKE ALL ON public.reviews_ronneby FROM anon, authenticated;

DROP POLICY IF EXISTS "Service role full access" ON public.reviews_ronneby;
CREATE POLICY "Service role full access"
  ON public.reviews_ronneby FOR ALL USING (true) WITH CHECK (true);
