-- Allow bookings with 0 adults (as long as total people >= 1)

-- Drop the old constraint that required at least 1 adult
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_adults_check;

-- Add new constraint allowing 0 adults
ALTER TABLE public.bookings ADD CONSTRAINT bookings_adults_check CHECK (adults >= 0 AND adults <= 6);

-- Ensure total people is at least 1 (since we might have 0 adults now)
-- Note: total_people is generated as adults + children
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_people_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_people_check CHECK (total_people >= 1 AND total_people <= 6);
