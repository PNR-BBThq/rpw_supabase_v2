# PNR Digital Native 2.1

Native Java / Android SDK application, navy–white–teal design. Android 10+ (min 29, target 35). Release package `my.pnr.digital.v2`, versionCode **3**. No WebView.

Home, Records, four-step Census, Tasks and Account plus a native RPW workspace: overview, RF/RV trends, filters, trap history, GPS quality review, corrections and CSV. Read [REVIEW.md](REVIEW.md) for confirmed limits, backend deployment requirements and release blockers.

## Build

Requires JDK 17, SDK `platforms;android-35` and `build-tools;35.0.0`. Set `ANDROID_SDK_ROOT` or `ANDROID_HOME`.

```sh
# Separate app/key: safe to install alongside the old release.
python3 android/build.py --debug
# Validate release packaging without the private key (not installable).
python3 android/build.py --unsigned
# Real release: original keystore is required, never a replacement key.
# Set PNR_SIGNING_STORE, PNR_SIGNING_PASSWORD, optional PNR_SIGNING_ALIAS (default pnr-v2).
python3 android/build.py
```

Outputs under `android/build/debug/` or `android/build/release/`; checksums included. Debug app ID is `my.pnr.digital.v2.debug`. It **does not** update the installed release app. Unsigned release builds are explicitly named `-unsigned.apk`.

GitHub Actions **Android native checks** builds APKs, checks native calculations on an emulator and uploads screenshots from labelled synthetic fixtures. Review the exact workflow result before downloading. This is not a signed production release pipeline.

## Release and data migration

Use the original signing certificate to update the existing package. Never uninstall/clear data while unsynced drafts exist. Old WebView localStorage has no automatic migration into the native encrypted draft store. Sync old drafts before upgrade. This repository contains no production signing key.

Set up the new RPW backend endpoints before testing the module. Signed authentication plus the approved Apps Script bridge configuration are required before correction controls become available. See the detailed review for deployment configuration and acceptance tests.
