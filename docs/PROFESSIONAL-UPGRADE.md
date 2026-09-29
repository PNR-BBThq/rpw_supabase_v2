# Professional upgrade checkpoint — 14 September 2026

Recovered the unfinished afternoon changes into the existing Android release branch.

- Shared navy, white and teal styling for web dashboard, survey and RPW; contextual module headings and reduced-motion support.
- Backend writes match the actual text type of Data.luas_serangan; updates retain the selected pest list.
- Removed writes to nonexistent user.state. Administrative profile edits cannot change record-owning user IDs.
- API responses prohibit caching.
- Atomic release SQL adds missing identity/retry fields and internal tables, enables RLS, limits direct access, and uses an invoker rate limiter.
- The migration is prepared, not applied or database-tested. Two conflicting duplicate login groups found during the earlier read-only audit must be resolved before it can proceed.
- Existing records are not assigned to accounts by name. Historical creation dates remain unknown.

## Outstanding release gates

Confirm the Vercel deployment's Supabase project and server service-role/secret key, and configure PNR_TOKEN_SECRET. Do not expose secrets in the browser or repository.
Resolve duplicate login identities with the account owner. Verify backup/recovery before coordinated schema deployment.
Confirm the authoritative RPW source: tangkapan_rpw was absent in the inspected public schema. Import approved KPI targets rather than inventing them.
Verify preview login, reporting, permissions, retry recovery and exports end to end.
Native parity remains incomplete for advanced maps, administration and all export formats. Android still has a single encrypted pending draft per account, not a background multi-draft outbox.
The prior signed Android 2.2 APK remains a test candidate. This checkpoint does not declare official readiness.

## Verification

GitHub Actions is the execution path while the local environment is unavailable.
The previous new serialization assertion incorrectly compared an empty map with an undefined fixture field; it now checks the actual expected empty JSON map.
Consult the workflow run for this commit for current results. UI changes still require browser verification on a reachable preview.
