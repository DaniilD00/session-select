-- Relax adults/children/total_people caps for admin manual reservations

-- Remove adults upper cap (was adults <= 6)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_adults_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_adults_check
  CHECK (adults >= 0);

-- Remove children upper cap (was children <= 5)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_children_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_children_check
  CHECK (children >= 0);

-- Remove total_people upper cap (was total_people <= 6), keep minimum 1
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_people_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_people_check
  CHECK (total_people >= 1);
    