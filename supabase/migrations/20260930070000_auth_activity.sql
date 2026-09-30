-- Add to existing user/session tables; retain all legacy accounts and records.
BEGIN;
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by bigint REFERENCES public."user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS pnr_user_auth_id ON public."user"(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pnr_user_email_unique ON public."user"(lower(btrim(email))) WHERE email IS NOT NULL AND btrim(email) <> '';
ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS session_key text,
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public."user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_uid text,
  ADD COLUMN IF NOT EXISTS auth_provider text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS logout_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_agent text;
CREATE UNIQUE INDEX IF NOT EXISTS pnr_session_key ON public.session_logs(session_key);
CREATE INDEX IF NOT EXISTS pnr_sessions_user_time ON public.session_logs(user_id,login_at DESC);
CREATE TABLE IF NOT EXISTS public.activity_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id bigint REFERENCES public."user"(id) ON DELETE SET NULL,
 actor_uid text NOT NULL,
 session_key text REFERENCES public.session_logs(session_key) ON DELETE SET NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 event text NOT NULL CHECK (length(event) BETWEEN 1 AND 120),
 route text NOT NULL CHECK (length(route)<=150),
 outcome text NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILED')),
 record_id text CHECK (length(record_id)<=100),
 http_status smallint NOT NULL CHECK (http_status BETWEEN 100 AND 599)
);
CREATE INDEX IF NOT EXISTS pnr_activity_time ON public.activity_logs(occurred_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS pnr_activity_user_time ON public.activity_logs(user_id,occurred_at DESC);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_logs FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.activity_logs FROM service_role;
GRANT SELECT,INSERT ON public.activity_logs TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.activity_logs_id_seq TO service_role;
-- Auth owns passwords. Metadata supplies application details only: role/status fixed here.
CREATE OR REPLACE FUNCTION public.pnr_auth_registration() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := NEW.raw_user_meta_data;
BEGIN
 IF m->>'pnr_registration' = 'true' THEN
  IF NEW.email IS NULL OR COALESCE(m->>'uid','') !~ '^[a-zA-Z0-9._@-]{1,100}$'
    OR length(COALESCE(m->>'nama','')) NOT BETWEEN 1 AND 250
    OR length(COALESCE(m->>'negeri','')) NOT BETWEEN 1 AND 250
    OR COALESCE(m->>'ic','') !~ '^[0-9]{12}$'
    OR length(COALESCE(m->>'jawatan','')) NOT BETWEEN 1 AND 250
    OR upper(btrim(m->>'negeri')) IN ('ALL','SEMUA') THEN
    RAISE EXCEPTION 'Maklumat pendaftaran tidak sah';
  END IF;
  IF EXISTS(SELECT 1 FROM public."user" WHERE ic=m->>'ic') THEN
   RAISE EXCEPTION 'Maklumat ini telah didaftarkan';
  END IF;
  INSERT INTO public."user"(uid,pwd,nama,ic,jawatan,negeri,email,auth_user_id,role,status,catatan)
  VALUES (lower(btrim(m->>'uid')),NULL,upper(btrim(m->>'nama')),left(m->>'ic',20),
    upper(left(m->>'jawatan',250)),m->>'negeri',lower(NEW.email),NEW.id,'STAFF','MENUNGGU','Pendaftaran Supabase Auth');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pnr_auth_registration() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS pnr_auth_registration ON auth.users;
CREATE TRIGGER pnr_auth_registration AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.pnr_auth_registration();
-- An admin cannot activate a newly registered account until its email is verified.
CREATE OR REPLACE FUNCTION public.pnr_verified_approval() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.auth_user_id IS NOT NULL AND NEW.status='AKTIF' AND
    (OLD.status IS DISTINCT FROM NEW.status OR OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id) THEN
   IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=NEW.auth_user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Pengguna perlu mengesahkan e-mel sebelum diluluskan';
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pnr_verified_approval() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS pnr_verified_approval ON public."user";
CREATE TRIGGER pnr_verified_approval BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.pnr_verified_approval();
COMMIT;
