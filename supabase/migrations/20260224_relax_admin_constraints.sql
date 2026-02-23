-- Relax CHECK constraints to support admin manual reservations

-- Allow additional payment methods used by admin
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('card', 'swish', 'klarna', 'admin', 'cash', 'invoice', 'other'));

-- Allow additional payment statuses used by admin
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'other'));

-- Relax adults cap (admin might book for larger groups)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_adults_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_adults_check
  CHECK (adults >= 0);

-- Relax children cap
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_children_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_children_check
  CHECK (children >= 0);

-- Relax total_people cap (keep >= 1)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_people_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_people_check
  CHECK (total_people >= 1);
