-- ============================================================
-- AnimeStudio AI — Supabase schema
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run
-- ============================================================

-- ---------- tables ----------

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  look_description text not null,
  reference_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  style text not null check (style in ('anime', 'cinematic')),
  type text not null check (type in ('text-to-video', 'image-to-video')),
  character_id uuid references characters(id) on delete set null,
  start_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references scenes(id) on delete set null,
  prompt text not null,
  style text not null check (style in ('anime', 'cinematic')),
  type text not null check (type in ('text-to-video', 'image-to-video')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  worker text,
  attempts int not null default 0,
  video_url text,
  thumbnail_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_created_idx
  on jobs (status, created_at);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete set null,
  scene_id uuid references scenes(id) on delete set null,
  title text,
  video_url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

-- ---------- storage buckets ----------
-- Primary video storage. TeraBox has no official API, so Supabase Storage
-- is the primary store; use TeraBox only as a manual backup (see README).

insert into storage.buckets (id, name, public)
values
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true),
  ('reference-images', 'reference-images', true)
on conflict (id) do nothing;

-- Public read on all three buckets (the dashboard is private, but the
-- GPU workers and <video> tags need direct URLs).
create policy "public read videos"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "public read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

create policy "public read reference-images"
  on storage.objects for select
  using (bucket_id = 'reference-images');

-- Writes go through the service-role key server-side, so no insert/update
-- policies are needed for anon users. Keep RLS enabled with no write policy
-- for the anon role.
