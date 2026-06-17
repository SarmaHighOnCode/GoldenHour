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
    beds_available    integer not null default 0,
    avg_response_rate double precision not null default 0.0,
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
    available     boolean not null default true
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
create index if not exists idx_conf_emergency on confirmation_requests (emergency_id);

-- ---------------------------------------------------------------------------
-- RPC: compatible donors within a radius, off-cooldown, nearest first.
-- Call via supabase.rpc('donors_nearby', {...}). Mirrors donor_service logic.
-- ---------------------------------------------------------------------------
create or replace function donors_nearby(
    p_lat            double precision,
    p_lng            double precision,
    p_groups         text[],
    p_radius_m       double precision default 5000,
    p_cooldown_days  integer default 90
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
           or d.last_donated < current_date - (p_cooldown_days || ' days')::interval)
      and ST_DWithin(
            d.location,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius_m)
    order by ST_Distance(
            d.location,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
$$;
