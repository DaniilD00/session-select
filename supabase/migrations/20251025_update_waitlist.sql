-- Extend waitlist schema for subscription model and promo assignment capping
alter table if exists public.waitlist
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dob date,
  add column if not exists consent boolean not null default false,
  add column if not exists code_sent boolean not null default false,
  add column if not exists code_sent_at timestamptz;

-- Ensure email is unique (already added in previous migration, keep for idempotency)
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));
