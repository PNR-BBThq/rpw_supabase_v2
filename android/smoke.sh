#!/usr/bin/env bash
set -euo pipefail
mkdir -p android/build/screenshots
capture_failure() {
  code=$?
  trap - EXIT
  adb logcat -d > android/build/screenshots/logcat.txt || true
  if [ "$code" -ne 0 ]; then
    adb exec-out screencap -p > android/build/screenshots/failure.png || true
    adb shell dumpsys activity activities > android/build/screenshots/activity.txt || true
    cat android/build/screenshots/native-checks.txt || true
    cat android/build/screenshots/home.xml || true
    tail -100 android/build/screenshots/logcat.txt || true
  fi
  exit "$code"
}
trap capture_failure EXIT
adb install --no-incremental -r android/build/debug/PNR-Digital-V2-2.4.0-debug.apk
adb logcat -c
adb shell am instrument -w my.pnr.digital.v2.debug/my.pnr.digital.v2.NativeChecks > android/build/screenshots/native-checks.txt
grep -q 'nativeChecks=passed' android/build/screenshots/native-checks.txt
adb exec-out run-as my.pnr.digital.v2.debug cat files/sample-report.pdf > android/build/screenshots/sample-report.pdf
for screen in home trend crops records cards form rpw tasks profile; do
  target="$screen"; tab="Ringkasan"; cards=false
  case "$screen" in trend) target=home; tab=Trend;; crops) target=home; tab=Tanaman;; cards) target=records; cards=true;; esac
  adb shell am force-stop my.pnr.digital.v2.debug
  adb shell am start -W -n my.pnr.digital.v2.debug/my.pnr.digital.v2.MainActivity --ez preview true --es screen "$target" --es tab "$tab" --ez cards "$cards"
  ready=false
  for attempt in 1 2 3 4 5; do
    sleep 2
    adb shell uiautomator dump /sdcard/window.xml
    adb pull /sdcard/window.xml "android/build/screenshots/$screen.xml"
    if grep -q 'package="my.pnr.digital.v2.debug"' "android/build/screenshots/$screen.xml"; then ready=true; break; fi
  done
  adb exec-out screencap -p > "android/build/screenshots/$screen.png"
  if [ "$screen" = home ] || [ "$screen" = trend ] || [ "$screen" = crops ] || [ "$screen" = records ]; then
    adb shell input swipe 540 1800 540 850 450
    sleep 1
    adb exec-out screencap -p > "android/build/screenshots/$screen-detail.png"
  fi
  if [ "$ready" != true ]; then echo "Native screen not visible: $screen"; exit 1; fi
done
adb logcat -d > android/build/screenshots/logcat.txt
if grep -E 'FATAL EXCEPTION|ANR in my.pnr.digital' android/build/screenshots/logcat.txt; then exit 1; fi
