-- Apply only after checking actual production table names; legacy migration.sql
-- uses different names. This migration intentionally aborts on that mismatch.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public."Data"') IS NULL OR to_regclass('public."user"') IS NULL THEN
    RAISE EXCEPTION 'Expected production tables public.Data and public.user; inspect schema first';
  END IF;
END $$;
ALTER TABLE public."Data" ADD COLUMN IF NOT EXISTS submission_id text;
ALTER TABLE public."Data" ADD COLUMN IF NOT EXISTS submission_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS data_submission_once ON public."Data" (uid, submission_id) WHERE submission_id IS NOT NULL;
-- Custom API sessions are verified by the server, not Supabase Auth JWTs.
-- Browser/mobile clients must have no direct table privileges.
REVOKE ALL ON public."Data", public."user" FROM anon, authenticated;
ALTER TABLE public."Data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS public.pnr_auth_attempts (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.pnr_auth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pnr_auth_attempts FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.pnr_take_auth_attempt(bucket_key text,max_attempts integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE count_now integer;
BEGIN
  IF length(bucket_key) <> 64 OR max_attempts NOT BETWEEN 1 AND 100 THEN RETURN false; END IF;
  INSERT INTO public.pnr_auth_attempts(bucket,attempts,expires_at)
  VALUES(bucket_key,1,now()+interval '15 minutes')
  ON CONFLICT(bucket) DO UPDATE SET
    attempts=CASE WHEN pnr_auth_attempts.expires_at<=now() THEN 1 ELSE pnr_auth_attempts.attempts+1 END,
    expires_at=CASE WHEN pnr_auth_attempts.expires_at<=now() THEN now()+interval '15 minutes' ELSE pnr_auth_attempts.expires_at END
  RETURNING attempts INTO count_now;
  DELETE FROM public.pnr_auth_attempts WHERE expires_at < now()-interval '1 day';
  RETURN count_now<=max_attempts;
END $$;
REVOKE ALL ON FUNCTION public.pnr_take_auth_attempt(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pnr_take_auth_attempt(text,integer) TO service_role;
COMMIT;
