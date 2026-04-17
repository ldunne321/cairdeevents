-- Cairde Events — attendees table
-- Run this in the Supabase SQL editor to set up the schema.

create table if not exists attendees (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  event_slug    text        not null,
  full_name     text        not null,
  is_plus_one   boolean     not null    default false,
  plus_one_of   text,
  dietary_requirement text  not null    default 'None',
  dietary_other text,
  has_allergy   boolean     not null    default false,
  allergy_detail text,
  allergy_severity text     check (allergy_severity in ('Mild', 'Severe', 'Anaphylactic')),
  has_epilepsy  boolean     not null    default false,
  gdpr_consent  boolean     not null    default false
);

create index if not exists attendees_event_slug_idx on attendees (event_slug);

-- Row-level security: allow anon key to insert (form submissions) and read (admin view).
-- Tighten these policies once authentication is added to the admin route.
alter table attendees enable row level security;

create policy "anon_insert" on attendees
  for insert to anon with check (true);

create policy "anon_select" on attendees
  for select to anon using (true);
