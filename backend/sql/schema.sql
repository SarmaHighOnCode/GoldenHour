-- GoldenHour database schema (PostgreSQL + PostGIS, via Supabase).
--
-- Run once in the Supabase SQL editor. Stores lat/lng as plain columns (so the
-- seed script can insert them over PostgREST) and derives a PostGIS geography
-- column from them for fast radius queries. Enable Realtime on
-- `confirmation_requests` afterwards so hospital replies push to the frontend.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- hospitals
-- ---------------------------------------------------------------------------
create table if not exists hospitals (
    id                text primary key,            -- e.g. "h1"
    name              text not null,
    lat               double precision not null,
    lng               double precision not null,
    location          geography(Point, 4326)
                          generated always as
                          (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored,
    departments       text[] not null default '{}',  -- {"trauma","cardiac","general"}
    -- RESERVED, not populated by the app. There is no public real-time bed feed
    -- in India, so the app never writes a fabricated number here. Capacity is
    -- confirmed by a human tapping Accept on the confirmation link. Kept for a
    -- future hospital-HIS integration that could fill these honestly.
    beds_available    integer default null,
    avg_response_rate double precision default null,
    phone             text,
    contact_phone     text
);

-- ---------------------------------------------------------------------------
-- blood_donors
-- ---------------------------------------------------------------------------
create table if not exists blood_donors (
    id            text primary key,                 -- e.g. "d42"
    name          text not null,
    phone         text not null,
    blood_group   text not null,                    -- "O+", "AB-", ...
    lat           double precision not null,
    lng           double precision not null,
    location      geography(Point, 4326)
                      generated always as
                      (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored,
    last_donated  date,                             -- null = never donated
    sex           text,                             -- 'male' | 'female' | null
    available     boolean not null default true
);

-- ---------------------------------------------------------------------------
-- blood_banks
--
-- Licensed blood banks that replacement donors are routed to. Per-bank unit
-- stock is NOT tracked (no public feed), so the app directs donors to the
-- nearest licensed bank rather than claiming a specific group is in stock.
-- ---------------------------------------------------------------------------
create table if not exists blood_banks (
    id        text primary key,                       -- e.g. "bb1"
    name      text not null,
    lat       double precision not null,
    lng       double precision not null,
    location  geography(Point, 4326)
                  generated always as
                  (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored,
    city      text
);

-- ---------------------------------------------------------------------------
-- emergency_requests
-- ---------------------------------------------------------------------------
create table if not exists emergency_requests (
    id                  text primary key,           -- request_id, e.g. "req0001"
    emergency_type      text not null,              -- trauma|cardiac|obstetric|general
    blood_group_needed  text not null,
    lat                 double precision not null,
    lng                 double precision not null,
    location            geography(Point, 4326)
                            generated always as
                            (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored,
    status              text not null default 'pending',  -- pending|confirmed|resolved
    donors_alerted      integer not null default 0,
    donors_responded    integer not null default 0,
    hospitals           jsonb not null default '[]',       -- ranked hospital-card snapshot
    created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- confirmation_requests
-- ---------------------------------------------------------------------------
create table if not exists confirmation_requests (
    id            text primary key default gen_random_uuid()::text,
    token         text unique not null,             -- the token in the /confirm URL
    emergency_id  text not null references emergency_requests(id) on delete cascade,
    hospital_id   text not null references hospitals(id),
    hospital_name text,                              -- denormalised for the confirm page
    sent_at       timestamptz not null default now(),
    replied_at    timestamptz,                      -- null until the hospital replies
    confirmed     boolean                           -- null=pending, true/false on reply
);

-- ---------------------------------------------------------------------------
-- Spatial indexes — make the radius queries fast.
-- ---------------------------------------------------------------------------
create index if not exists idx_donors_loc on blood_donors using gist (location);
create index if not exists idx_hosp_loc   on hospitals    using gist (location);
create index if not exists idx_banks_loc  on blood_banks  using gist (location);
create index if not exists idx_conf_emergency on confirmation_requests (emergency_id);

-- ---------------------------------------------------------------------------
-- RPC: compatible donors within a radius, off-cooldown, nearest first.
-- Call via supabase.rpc('donors_nearby', {...}). Mirrors donor_service logic.
-- ---------------------------------------------------------------------------
create or replace function donors_nearby(
    p_lat                   double precision,
    p_lng                   double precision,
    p_groups                text[],
    p_radius_m              double precision default 5000,
    p_cooldown_days         integer default 90,
    p_cooldown_days_female  integer default 120
)
returns setof blood_donors
language sql
stable
as $$
    select *
    from blood_donors d
    where d.blood_group = any(p_groups)
      and d.available = true
      and (d.last_donated is null
           or d.last_donated < current_date
               - ((case when d.sex = 'female'
                        then p_cooldown_days_female
                        else p_cooldown_days end) || ' days')::interval)
      and ST_DWithin(
            d.location,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius_m)
    order by ST_Distance(
            d.location,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
$$;

-- ---------------------------------------------------------------------------
-- RPC: atomic first-accept-wins confirmation.
--
-- A single UPDATE that checks and writes in one statement. Postgres evaluates
-- the NOT EXISTS subquery under the UPDATE's snapshot, so two simultaneous
-- ACCEPT taps cannot both win — only one UPDATE will match rows.
--
-- Returns TRUE if this call won the race (rows updated > 0), FALSE otherwise.
-- Call via supabase.rpc('claim_emergency', {'p_token': ..., 'p_emergency_id': ...}).
-- ---------------------------------------------------------------------------
create or replace function claim_emergency(
    p_token         text,
    p_emergency_id  text
)
returns boolean
language plpgsql
as $$
declare
    v_rows integer;
begin
    update confirmation_requests
    set confirmed  = true,
        replied_at = now()
    where token        = p_token
      and confirmed is null
      and not exists (
          select 1
          from confirmation_requests
          where emergency_id = p_emergency_id
            and confirmed = true
      );
    get diagnostics v_rows = row_count;
    return v_rows > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS)
-- ---------------------------------------------------------------------------
-- Tables created above have RLS DISABLED by default, so the anon key can read
-- and write — convenient for the demo/prototype.
--
-- Recommended production model:
--   * Backend uses the SERVICE-ROLE key (SUPABASE_SERVICE_KEY) — bypasses RLS,
--     so all writes (emergencies, confirmations, donor inserts) go through the
--     trusted server.
--   * Frontend uses the anon key with read-only access to just what it needs to
--     subscribe to via Realtime.
--
-- To lock down, enable RLS and add read-only anon policies, e.g.:
--
--   alter table confirmation_requests enable row level security;
--   create policy "anon reads confirmations"
--     on confirmation_requests for select to anon using (true);
--
--   alter table emergency_requests enable row level security;
--   create policy "anon reads emergencies"
--     on emergency_requests for select to anon using (true);
--
-- (Writes still succeed because the backend connects with the service-role key.)
