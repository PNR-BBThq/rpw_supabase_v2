#!/usr/bin/env bash
set -euo pipefail
mkdir -p android/build/screenshots
adb install -r android/build/debug/PNR-Digital-V2-2.2.0-debug.apk
adb logcat -c
adb shell am instrument -w my.pnr.digital.v2.debug/my.pnr.digital.v2.NativeChecks > android/build/screenshots/native-checks.txt
grep -q 'nativeChecks=passed' android/build/screenshots/native-checks.txt
for screen in home records form rpw tasks profile; do
  adb shell am force-stop my.pnr.digital.v2.debug
  adb shell am start -W -n my.pnr.digital.v2.debug/my.pnr.digital.v2.MainActivity --ez preview true --es screen "$screen"
  sleep 2
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "android/build/screenshots/$screen.xml"
  grep -q 'package="my.pnr.digital.v2.debug"' "android/build/screenshots/$screen.xml"
  adb exec-out screencap -p > "android/build/screenshots/$screen.png"
done
adb logcat -d > android/build/screenshots/logcat.txt
if grep -E 'FATAL EXCEPTION|ANR in my.pnr.digital' android/build/screenshots/logcat.txt; then exit 1; fi
