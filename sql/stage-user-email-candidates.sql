-- Padanan e-mel pegawai daripada Data ke kawasan semakan TERLINDUNG.
-- Tidak menambah lajur public.user, tidak mencipta pengguna Supabase Auth.
-- Audit semasa: 36 padanan ketat daripada 135 akaun (25 September 2026).
-- Run once, as an admin migration. No raw passwords or identity documents.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pnr_migration;
REVOKE ALL ON SCHEMA pnr_migration FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS pnr_migration.user_email_candidates (
 uid text PRIMARY KEY,
 candidate_email text NOT NULL UNIQUE,
 supporting_reports integer NOT NULL CHECK (supporting_reports >= 2),
 match_status text NOT NULL DEFAULT 'UNVERIFIED_FROM_REPORT'
  CHECK (match_status IN ('UNVERIFIED_FROM_REPORT','MANUALLY_VERIFIED','REJECTED')),
 staged_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON pnr_migration.user_email_candidates FROM PUBLIC, anon, authenticated;
ALTER TABLE pnr_migration.user_email_candidates ENABLE ROW LEVEL SECURITY;

WITH u AS (
 SELECT lower(btrim(uid)) AS uid_key,
        upper(regexp_replace(btrim(nama),'[[:space:]]+',' ','g')) AS name_key,
        upper(regexp_replace(btrim(negeri),'[[:space:]]+',' ','g')) AS state_key
 FROM public."user"
 WHERE uid IS NOT NULL AND nama IS NOT NULL AND negeri IS NOT NULL
), d AS (
 SELECT upper(regexp_replace(btrim(nama),'[[:space:]]+',' ','g')) AS name_key,
        upper(regexp_replace(btrim(negeri),'[[:space:]]+',' ','g')) AS state_key,
        lower(btrim(email)) AS email_key,
        count(*)::integer AS report_count
 FROM public."Data"
 WHERE nama IS NOT NULL AND negeri IS NOT NULL
   AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
 GROUP BY 1,2,3
), c AS (
 SELECT u.uid_key, u.name_key, u.state_key,
        min(d.email_key) AS email_key, sum(d.report_count)::integer AS report_count
 FROM u JOIN d ON u.name_key=d.name_key AND u.state_key=d.state_key
 GROUP BY 1,2,3
 HAVING count(DISTINCT d.email_key)=1
), strict_matches AS (
 SELECT c.* FROM c
 WHERE c.report_count >= 2
   AND (SELECT count(*) FROM u x WHERE x.uid_key=c.uid_key)=1
   AND (SELECT count(DISTINCT x.name_key) FROM d x WHERE x.email_key=c.email_key)=1
   AND (SELECT count(DISTINCT x.state_key) FROM d x WHERE x.email_key=c.email_key)=1
   AND (SELECT count(*) FROM c x WHERE x.email_key=c.email_key)=1
)
INSERT INTO pnr_migration.user_email_candidates(uid,candidate_email,supporting_reports)
SELECT uid_key,email_key,report_count FROM strict_matches;
COMMIT;

-- Semakan selepas migrasi (hanya bilangan, tanpa memaparkan e-mel):
-- SELECT match_status,count(*) FROM pnr_migration.user_email_candidates GROUP BY 1;
-- SELECT has_schema_privilege('anon','pnr_migration','USAGE') AS anon_schema_access,
--        has_table_privilege('anon','pnr_migration.user_email_candidates','SELECT') AS anon_table_access;
