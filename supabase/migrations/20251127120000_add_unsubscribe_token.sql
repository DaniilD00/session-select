alter table public.waitlist
  add column if not exists unsubscribe_token text not null
    default md5(random()::text || clock_timestamp()::text);

create unique index if not exists idx_waitlist_unsubscribe_token
  on public.waitlist(unsubscribe_token);
