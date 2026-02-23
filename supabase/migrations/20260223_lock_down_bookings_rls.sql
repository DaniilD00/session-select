-- SECURITY FIX: Lock down bookings table INSERT/UPDATE to service role only
-- Previously, "Anyone can create bookings" (INSERT WITH CHECK true) and
-- "Service role can update bookings" (UPDATE USING true) allowed any anonymous
-- user to insert/update bookings directly via the REST API, bypassing edge functions.

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can update bookings" ON public.bookings;

-- Revoke INSERT and UPDATE from public roles
-- (Service role automatically bypasses RLS, so edge functions still work)
REVOKE INSERT ON public.bookings FROM anon, authenticated;
REVOKE UPDATE ON public.bookings FROM anon, authenticated;

-- Also revoke DELETE to be safe (no existing policy but prevent future issues)
REVOKE DELETE ON public.bookings FROM anon, authenticated;
