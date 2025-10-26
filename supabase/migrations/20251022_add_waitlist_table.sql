-- Create waitlist table for launch emails
create extension if not exists "uuid-ossp";

create table if not exists public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Allow anonymous insert to collect emails
create policy "Allow anon insert into waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- Optionally, disallow selects from anon (no policy for select)
