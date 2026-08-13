-- =====================================================================
-- Adds:
--   1. duration_minutes       — optional custom session length (admin can
--                                assign e.g. a 2h party booking instead of
--                                the location's default slot length).
--   2. booking_group_id / is_group_primary — link several booking rows
--                                together for Ronneby's "book up to 4
--                                consecutive slots" feature. Each occupied
--                                slot still gets its own row (so the existing
--                                exact-match availability/blocking logic needs
--                                no changes), but rows sharing a group id
--                                belong to the same checkout. The earliest
--                                slot is flagged is_group_primary=true and
--                                carries the full combined price/guest count;
--                                the rest carry 0 so nothing is double-counted.
--   3. 'on-site' as a valid payment_status/payment_method value, so admin can
--      mark a booking as "pays on arrival" instead of misusing 'other'.
--
-- Applies to both public.bookings and public.bookings_ronneby.
-- =====================================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_group_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_group_primary BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.bookings_ronneby ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.bookings_ronneby ADD COLUMN IF NOT EXISTS booking_group_id UUID;
ALTER TABLE public.bookings_ronneby ADD COLUMN IF NOT EXISTS is_group_primary BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON public.bookings(booking_group_id) WHERE booking_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_ronneby_group_id ON public.bookings_ronneby(booking_group_id) WHERE booking_group_id IS NOT NULL;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('card', 'swish', 'klarna', 'admin', 'cash', 'invoice', 'other', 'on-site'));

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'other', 'on-site'));

-- bookings_ronneby was created via `LIKE public.bookings INCLUDING ALL`, which
-- preserves the source constraint names verbatim (constraint names only need
-- to be unique per-table, not database-wide) — so the constraints here are
-- named the same as on public.bookings, NOT "bookings_ronneby_...".
ALTER TABLE public.bookings_ronneby DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings_ronneby ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('card', 'swish', 'klarna', 'admin', 'cash', 'invoice', 'other', 'on-site'));

ALTER TABLE public.bookings_ronneby DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings_ronneby ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'other', 'on-site'));
