# Android 2.3 — native analytics workspace

Native Java dashboard redesign: KPI grid, monthly activity, top 15 pests, crop distribution, shared district/crop/pest filters for records and exports. All charts use actual filtered cached records. No embedded WebView.

Version code 5. Release signing with the existing private key is required before this can update the installed production package. CI publishes an isolated debug APK and unsigned release packaging candidate; neither is an official signed update.

Smoke tests now retain logcat and screenshots on failure and allow bounded screen readiness retries. Database and full web/native parity gates from RELEASE-2.2 and docs/PROFESSIONAL-UPGRADE remain outstanding. Advanced map, full admin flows and remaining export formats are not implemented by this dashboard revision.
