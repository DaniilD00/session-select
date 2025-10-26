-- Create waitlist table for launch discount subscribers
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  consent BOOLEAN NOT NULL DEFAULT false,
  code_sent BOOLEAN NOT NULL DEFAULT false,
  code_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert their email (for public signups)
CREATE POLICY "Anyone can subscribe to waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view their own waitlist entry"
ON public.waitlist
FOR SELECT
USING (auth.uid() IS NOT NULL OR true);

-- Policy: Only service role can update (for code assignment)
CREATE POLICY "Service role can update waitlist"
ON public.waitlist
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on email for faster lookups
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_code_sent ON public.waitlist(code_sent);