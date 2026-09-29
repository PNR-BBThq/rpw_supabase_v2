# Android 2.4 — surveillance visual redesign

Version code 6. Native Java/Android Views; no embedded WebView.

- Compact surveillance dashboard, navy navigation, animated page entry.
- Animated interactive area/line chart; tap data points or use accessibility click actions. Native donut with color legend, counts and percentages. Motion follows Android animator settings and stops on detach.
- Months without records are omitted and clearly labelled. Planted/attacked area is reported aggregate, not unique land area. Crop distribution uses report counts and groups the long tail explicitly.
- Record explorer switches between striped horizontal table and cards, with debounced AND search, field selection, sorting and 20-record pagination. Filters and exports share the same selected rows.
- Debug-only demo is accessible from the login screen and prominently marked DATA CONTOH. It does not write to the production database. Release builds do not expose demo entry.
- Preserve original release signing key and application ID; do not uninstall the previous production APK with unsent drafts.

Verification: backend tests plus Android instrumentation checks for field-scoped AND search, date sorting and numeric area sorting. CI builds debug and unsigned release variants and captures nine screens plus scrolled dashboard/chart/table details. Official acceptance still requires real account/device, backend migration readiness and complete web/native parity checks from earlier release notes.

Design references: Android common layouts (https://developer.android.com/design/ui/mobile/guides/layout-and-content/common-layouts) and Material Design 3 (https://m3.material.io/). This is a custom native implementation, not a claim of full Material Components adoption.
