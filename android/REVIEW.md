> Updated release assessment: see [RELEASE-2.2.md](RELEASE-2.2.md). The findings below are the historical 2.1 review; several are fixed in 2.2 code but await coordinated deployment.

# Android 2.1 review and release status

Reviewed baseline: `5112d252b63fde4f4e9e84d0d4f4dfc7875b16f5`, including native replacement `e822e9c` and original Android shell `c836d10`.

## Implemented in this branch

- Navy (#10233F), white and teal (#007774) system with readable secondary text, custom vector navigation icons, ripple feedback, distinct module entry cards, form stepper and photo previews.
- Five existing modules preserved; RPW is a native workspace accessible from Home and Account. Overview, filters, paginated trap list, full-location history, RF/RV totals, monthly RF chart, repeated high RTD readings, GPS scatter plot, data-quality review, CSV export, and native correction dialogs.
- RPW latest readings are computed **within the selected year**, rather than selecting the latest all-time record before filtering. Missing RTD is explicitly unknown, not zero. Exact RTD=1 has its own state. Duplicate detection includes state, district, location and collection date.
- New authenticated, server-scoped RPW read endpoint with bounded pages and deterministic row-ID ordering. Complete downloads replace encrypted account-specific snapshots only after every page succeeds. A failed download retains the previous snapshot. Maximum native download: 20,000 rows; oversized results fail visibly rather than displaying partial totals.
- Native RPW corrections proxy the existing Apps Script source, preserving the Google Sheets/Supabase synchronization path. The mobile app never receives the Apps Script ticket. Correction controls require a fresh response reporting server capability and admin/supervisor role. Server independently verifies role and geography.
- Optional signed-token rollout: setting `PNR_TOKEN_SECRET` (32+ random bytes) makes login issue HMAC-signed tokens and rejects old unsigned sessions. Without it existing web sessions remain compatible, but native RPW mutations stay disabled. Do not describe legacy mode as secure.
- PNR analytics and crop reference caches scoped to account. Read failures preserve last successful cache. Cache age and connectivity shown. Callback account checks prevent a late crop/reference response from crossing logout/login boundaries.
- Camera URI, form step and pending export survive Activity saved-state recreation; CSV payload stays outside Bundle. MediaStore camera captures are pending until successful; cancelled captures are deleted. Photo processing blocks navigation and prevents simultaneous additions exceeding four images. Location timeout callbacks are cancelled with the request; approximate location uses a compatible provider; denied permissions offer settings/manual entry.
- PNR task lists now paginate beyond the previous 100-row limit.
- Separate debug application ID `my.pnr.digital.v2.debug`, release package unchanged, versionCode 3 / versionName 2.1.0. Deterministic clean staging, SDK preflight, signing verification, alignment check and SHA-256 output. Unsigned release packaging never silently becomes a debug-signed release.
- CI builds debug + unsigned release APKs, runs backend policy tests and Android instrumentation checks, then captures synthetic native screenshots. Debug fixtures are guarded by Android's debuggable flag and are not available in release APKs.

## Remaining release blockers

| Priority | Evidence / issue | Required next action |
|---|---|---|
| P0 | `backend/middleware.js` previously accepted forgeable Base64 tokens. Legacy mode still exists for compatibility until configured. | Configure a strong `PNR_TOKEN_SECRET`, re-login all clients, verify all web/native flows, then remove legacy mode. Native RPW writes refuse legacy configuration. |
| P0 | `backend/data/submit-bancian.js` has no authMiddleware call, trusts submitted name/status and can report success despite photo upload failure. Passwords are compared as plaintext in `backend/auth/login.js`. Several other backend routes require a separate authorization audit. | Harden the full shared API, migrate passwords with a tested authentication plan, enforce ownership/status server-side and return upload failures accurately before broad release. Changing only button visibility cannot fix this. |
| P0 | PNR submission has no server-enforced idempotency. Process death or lost response after insert can lead to duplicate reports on retry. | Add persisted client operation IDs plus database uniqueness and reconciliation. Do not enable automatic resubmission yet. |
| P1 | Native RPW mutation source code/contract is outside this repo; old page sends `UPDATE_GPS`, `UPDATE_LOCATION`, `DELETE` to Apps Script. | Configure the three environment values below, confirm a valid ticket and test authorized/unauthorized changes using staging records. Verify propagation to Supabase and upstream audit logging. No real records were modified during development. |
| P1 | Existing `rpw.html` requests `/api/get-rpw`, but `api/index.js` does not register that legacy route. The new native endpoint does not repair the old web page. | Decide and implement a secure authenticated migration for the web RPW reader; do not simply expose the service-key reader publicly. |
| P1 | Existing release keystore is not in the repository or this checkout. Previous README's same-signature promise was not independently verified. | Use the original private keystore and compare certificate SHA-256 against the installed APK. Test an in-place upgrade with a saved draft. Never replace that key or tell users to uninstall to fix a signature mismatch. |
| P1 | Real account/device and offline interruption validation is still required. Synthetic screenshots are not an end-to-end acceptance test. | Complete the device matrix below and inspect Actions results for the exact commit being released. |

## Functional limits that remain visible to users

- Offline means encrypted last-loaded analytics/RPW/reference data and a PNR draft. It does not include offline login, automatic outbox sync, cached task/pending queues or offline verification. Only one active draft per account exists; opening a correction can replace it (confirmation required in UI).
- RPW current web flow has no create-catch endpoint. This branch ports the existing monitoring and correction flow; it does not invent a new trap/catch submission contract. Creating new RPW capture records requires the upstream schema/workflow to be supplied and integrated.
- RPW GPS view is a labelled coordinate scatter plot, not a road/basemap or offline navigation. Navigation opens a maps app. Missing/invalid coordinates are audited, never silently plotted at zero.
- Charts show bounded groups (24), and detail history shows 100 most recent readings. Narrow filters for large histories. Paged downloads can still change during concurrent source updates: a server snapshot/cursor API remains the long-term fix.
- RPW status thresholds are displayed from `status_rtd_rf`; the client does not invent a formula or sampling interval. Duplicate candidates can represent distinct traps sharing a location; confirmation is necessary.
- PNR full-map analytics, PDF/Excel/KML/GeoJSON export, full user administration and account recovery remain external web functions. Adding images while correcting an existing PNR record remains a web function.
- Large encrypted caches/draft photos still use SharedPreferences and can cause main-thread disk work. Move large payloads to transactional files/Room with a multi-draft outbox before scaling. Keystore/decryption failures are now surfaced and the original ciphertext is protected from overwrite; recovery still requires support if the key is irretrievably lost.
- One Activity still hosts the PNR views. Extracting screens, localized strings, repositories and lifecycle-aware state is a useful follow-up; the new RPW module/model is already separated. Predictive Back and full TalkBack/large-font acceptance remain pending.

## Deployment configuration

Set server environment variables (never commit values):

- `PNR_TOKEN_SECRET`: at least 32 random bytes; all existing sessions will need to log in again after activation.
- `PNR_RPW_CRUD_URL`: approved deployed Apps Script `/exec` URL (`https://script.google.com/.../exec`).
- `PNR_RPW_CRUD_TICKET`: ticket accepted by that deployment. Verify upstream permission and synchronization rules before enabling.

Backend deployment must include `api/index.js`, `backend/rpw/*`, `backend/token-signing.js` and the updated middleware. Until then native RPW requests will return a clear API error; installing the APK alone does not deploy the new endpoints.

## Device acceptance matrix

1. Android 10 and Android 15+, including a physical Samsung phone: startup, safe areas, 200% font scale, keyboard, landscape, TalkBack focus/labels, Back navigation.
2. Log in, load analytics and references, enter a draft, airplane mode, reopen. Verify crop options and cache age. Switch accounts and check no data leakage.
3. GPS fine, approximate, deny, permanently deny, service disabled and timeout; location request A must not cancel a later request B. Manually entered coordinates remain available.
4. Camera capture/cancel/no camera app, system file picker cancel, huge image, four-photo limit, process death while camera/picker is open. Verify thumbnail orientation and recovery.
5. Export PNR/RPW CSV to local storage and a document provider; cancel; kill/recreate while picker is open; verify BOM, quoting, formula-leading characters and filter scope.
6. Submit over slow internet; repeat tap; lose response; reopen. Verify original report before retry. Verify rejected report edits and explanatory validation errors.
7. RPW state/Cameron scoping, year transitions, exact RTD=1, unknown RTD, GPS error and duplicate candidates, history, denied edits, source failure and stale snapshot retention.
8. Install original release, save draft, install same-key versionCode 3 without uninstalling. Confirm account/draft recovery and signing certificate.

## References used

- Android lifecycle/state: https://developer.android.com/topic/libraries/architecture/saving-states
- Camera/document intents: https://developer.android.com/guide/components/intents-common
- Permission minimization: https://developer.android.com/privacy-and-security/minimize-permission-requests
- APK signing/alignment: https://developer.android.com/build/building-cmdline
