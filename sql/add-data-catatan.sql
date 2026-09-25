-- Applied to Supabase project nvwagmxbvhywlpqmssnm as migration add_data_catatan_pemerhatian.
-- Nullable for existing reports; keep separate from syor_kawalan.
alter table public."Data" add column if not exists catatan text;
comment on column public."Data".catatan is 'Catatan pemerhatian lapangan berasingan daripada syor kawalan.';
