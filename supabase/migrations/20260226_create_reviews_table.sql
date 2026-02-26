-- Create reviews table for post-session feedback
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  enjoyed TEXT,
  improve TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_email_sent_at TIMESTAMP WITH TIME ZONE,
  google_review_shown BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (via edge functions)
REVOKE ALL ON public.reviews FROM anon, authenticated;

-- Allow service role to read for admin
CREATE POLICY "Service role full access"
ON public.reviews
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for token lookups
CREATE INDEX idx_reviews_token ON public.reviews(token);
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);

-- Add review_token column to bookings for linking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review_token VARCHAR(64);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review_email_sent_at TIMESTAMP WITH TIME ZONE;
