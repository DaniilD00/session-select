-- Secure and optimize RLS policies

-- 1. Bookings: Restrict SELECT to non-PII columns and simplify policy
-- Revoke table-level SELECT permission
REVOKE SELECT ON public.bookings FROM anon, authenticated;
-- Grant column-level SELECT permission for availability checks
GRANT SELECT (booking_date, time_slot, payment_status) ON public.bookings TO anon, authenticated;

-- Drop the old performance-heavy policy
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

-- Create a new public policy for availability checking (restricted by column privileges)
CREATE POLICY "Public availability check"
ON public.bookings
FOR SELECT
USING (true);

-- 2. Waitlist: Remove direct access (handled by Edge Functions)
-- Drop the old performance-heavy policy
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.waitlist;

-- Revoke SELECT permission just in case
REVOKE SELECT ON public.waitlist FROM anon, authenticated;
