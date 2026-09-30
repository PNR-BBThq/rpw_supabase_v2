ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS pending_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pnr_user_pending_auth ON public."user"(pending_auth_user_id) WHERE pending_auth_user_id IS NOT NULL;
