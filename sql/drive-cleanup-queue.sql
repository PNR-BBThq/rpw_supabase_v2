-- Retain deletion intent before removing the database link. Apply before deploying
-- backend/gdrive/cleanup.js and only with a server-side service_role key.
create table if not exists public.pnr_drive_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  links text[] not null,
  requested_by text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  constraint pnr_drive_cleanup_link_count check (cardinality(links) between 1 and 10)
);
create index if not exists pnr_drive_cleanup_pending on public.pnr_drive_cleanup_jobs (created_at)
  where completed_at is null;
alter table public.pnr_drive_cleanup_jobs enable row level security;
revoke all on public.pnr_drive_cleanup_jobs from public, anon, authenticated;
grant select, insert, update on public.pnr_drive_cleanup_jobs to service_role;
