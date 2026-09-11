# PNR Android 2.2 — release candidate

This is a native Java/Android SDK application. It contains no WebView and does not install a PWA. Dashboard, records, four-step survey, tasks, account area and RPW monitoring/corrections are Android views. Camera capture uses the installed Android camera app via an intent; GPS uses Android location services; CSV and PDF use Android's document picker.

## What changed

- Navy/white/teal module cards and navigation, clear empty states, RPW segmentation.
- Native paginated PDF report in addition to filtered CSV.
- Encrypted per-account survey draft, analytics/RPW/reference caches and last-loaded task lists.
- Pending survey submissions keep an immutable payload and UUID across process death. Retry first checks server receipt; the database unique index enforces one report per account/UUID. Changed payloads return conflict. The new client refuses to submit through an old server without this protocol.
- Signed sessions are mandatory; password changes invalidate existing sessions. Successful legacy-password login upgrades that row to salted scrypt using a compare-and-set write. New passwords require at least 12 characters.
- No public password disclosure/reset; no passwords in admin responses. Public registration cannot grant ADMIN or active status. Login/registration have a database-backed attempt limit.
- Report ownership, supervisor actions and state/Cameron scope are checked by the server. Failed/unconfirmed photo uploads cannot be reported as successful submissions.
- Original PKCS12 release key recovered privately. No key or password is in this repository, CI or APK.

## Deployment order — required before official use

1. Inspect the actual Supabase schema and create a database backup. The old `sql/migration.sql` uses `users/data_bancian`, while deployed handlers use `user/Data`; do not run the old migration blindly.
2. Apply `sql/official-release.sql` against the verified production schema. Confirm `Data.id` accepts text IDs, `uid` exists, `pwd` can store at least 120 characters, and report status `BARU` is allowed. The migration aborts if the expected table names are absent. It adds submission UUID/hash and a unique index, restricts direct user/data table access, and adds the atomic auth attempt limiter.
3. Configure Vercel `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `PNR_TOKEN_SECRET` (at least 32 random bytes). Existing `RAHSIA_*` aliases remain for the server role credentials. Missing signing configuration or migration fails closed. No secret values belong in source code or the mobile app.
4. Configure/verify `PNR_IMAGE_UPLOAD_URL`, `PNR_RPW_CRUD_URL` and `PNR_RPW_CRUD_TICKET`. Audit the upstream Apps Script deployment permissions and perform non-production image/mutation tests. Its source and authority are outside this repository.
5. Deploy the coordinated backend/web change, sign in again, verify real STAFF/PENYELIA/ADMIN scope and a staging report over interrupted internet, then approve rollout of the signed APK. Do not deploy the authentication change before preparing the database/configuration; it deliberately disables insecure legacy sessions.
6. Test in-place update from the existing signed APK without uninstalling, including a saved draft. Certificate SHA-256 must match `8DA2A5D45F61CB4DFD392554773685F070C64981968190E6073C8F881E79533B`.

## Remaining acceptance and feature boundaries

The build is a release candidate, not an assertion of production acceptance. Vercel/Supabase connections are needed to apply and verify the above configuration. No live user credentials or live data mutations have been used in testing.

- Physical-device checks remain: fine/approximate/denied GPS, camera cancel/process death, provider export/cancel, airplane mode, large font/TalkBack, and same-key update with a saved draft.
- Only one active survey draft per account; no automatic background outbox. Tasks are last-loaded snapshots. Edits/verification require internet and are re-authorized by the server.
- RPW ports the available monitoring/correction workflow. Creation of new trap/catch records requires the upstream field/schema/Apps Script contract. The coordinate plot is labelled as such; road navigation opens a maps app.
- Full-map analytics, Excel/KML/GeoJSON, full user administration and existing-record photo additions still use the external web system. The legacy RPW web reader also needs a coordinated authenticated migration.
- Duplicate report insertion is prevented by the database index. Concurrent/retried image uploads can still leave orphan Drive files because the external upload service has no documented idempotency contract; agree an upstream cleanup/idempotency strategy.
- Historic rows with absent/incorrect `uid` need a reviewed ownership migration. Do not assign by ambiguous display names automatically.
- Broad web security review and upstream Apps Script permission review remain necessary for official deployment; protecting this API alone does not remove exposed external-script access.

## Verification

`node --experimental-test-module-mocks --test tests/native*.test.mjs` covers signed token forgery/expiry/missing configuration, password migration, scope/ownership, submission validation, concurrent retries/conflicts, missing migrations and password-recovery denial. Android Actions compiles both variants, installs debug, runs real Android JSON/Keystore checks, renders a two-page native PDF, and captures six screens. Check the Actions run for the exact release commit.

Debug package: `my.pnr.digital.v2.debug`. Release: `my.pnr.digital.v2`, versionCode 4, versionName 2.2.0, minimum Android 10. Unsigned artifacts are not installable. The final APK is signed locally with the original key and verified using apksigner.
