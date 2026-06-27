-- Places（施設）
create table if not exists places (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  created_from text not null check (created_from in ('auto', 'manual')),
  created_at timestamptz default now()
);

-- Trips（旅行）
create table if not exists trips (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

-- Groups（Visitドラフト）
create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  center_lat double precision not null,
  center_lng double precision not null,
  time_start timestamptz not null,
  time_end timestamptz not null,
  selected_place_id uuid references places(id),
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz default now()
);

-- Visits（確定済み訪問）
create table if not exists visits (
  id uuid default gen_random_uuid() primary key,
  place_id uuid not null references places(id),
  trip_id uuid not null references trips(id),
  visited_at_start timestamptz not null,
  visited_at_end timestamptz not null,
  created_at timestamptz default now()
);

-- Photos
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  taken_at timestamptz not null,
  lat double precision,
  lng double precision,
  group_id uuid references groups(id),
  visit_id uuid references visits(id),
  created_at timestamptz default now()
);

-- Group x Place candidates（候補施設）
create table if not exists group_place_candidates (
  group_id uuid not null references groups(id) on delete cascade,
  place_id uuid not null references places(id),
  score double precision not null default 0,
  primary key (group_id, place_id)
);

-- インデックス
create index if not exists photos_group_id_idx on photos(group_id);
create index if not exists photos_visit_id_idx on photos(visit_id);
create index if not exists visits_trip_id_idx on visits(trip_id);
create index if not exists visits_place_id_idx on visits(place_id);
create index if not exists places_lat_lng_idx on places(lat, lng);

-- Supabase Storage バケット（Supabaseダッシュボードで手動作成も可）
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
