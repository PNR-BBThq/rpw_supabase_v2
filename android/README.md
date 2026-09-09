# PNR Digital Native 2.0

Aplikasi Android dengan UI **native Java / Android SDK**, tanpa WebView. Backend menggunakan API sistem v2 di https://rpw-supabase-v2.vercel.app/.

Package `my.pnr.digital.v2` · versionCode 2 · Android 10/API 29 ke atas.

## Fungsi native

- Login dan sesi tersulit menggunakan Android Keystore; kata laluan tidak disimpan.
- Navigasi bawah: Utama, Rekod, Bancian, Tugasan, Akaun.
- Dashboard KPI ringkasan, tempoh/negeri dan perosak utama daripada rekod sebenar yang disahkan.
- Carian dan pagination 20 rekod setiap halaman, butiran laporan, eksport CSV melalui pemilih fail Android.
- Borang empat langkah, tarikh native, negeri/daerah, master kategori/tanaman dan cadangan perosak, multi-perosak, luas/peratus/keterukan, syor.
- Pengesanan GPS dengan kebenaran Android dan ketepatan; koordinat manual.
- Kamera/pemilih gambar, pemampatan, sehingga empat gambar baharu untuk setiap laporan (500KB JPEG maksimum setiap gambar selepas pemampatan).
- Draf telefon disulitkan mengikut akaun. Draf tidak dihantar automatik; pengguna menyemak sebelum penghantaran.
- Senarai tugasan, butiran, pembetulan draf/ditolak dan hantar semula. Gambar rekod lama dikekalkan; penambahan gambar semasa edit masih melalui web.
- Pengesahan / penolakan oleh peranan admin/penyelia dengan sebab penolakan.
- Sasaran KPI dan senarai pengguna (admin) dipaparkan secara native.

## Fungsi yang masih dalam pelayar

RPW, peta interaktif penuh, analisis lanjutan, pendaftaran/pemulihan akaun, pentadbiran pengguna penuh dan eksport PDF/Excel/KML/GeoJSON dibuka melalui pelayar luar. APK native tidak mendakwa semua modul web telah dipindahkan. Pengesahan akses pelayan kekal berkuasa; butang mengikut peranan bukan pengganti kawalan pelayan.

## Migrasi daripada APK 1.0

APK 2.0 menggunakan pakej dan tandatangan yang sama untuk kemas kini. Segerakkan draf APK WebView lama terlebih dahulu: stor draf native berasingan dan tiada migrasi automatik daripada localStorage WebView. Pengguna perlu login semula dalam UI native. Jangan uninstall/clear data sebelum menyegerakkan draf.

## Binaan

JDK 17 dengan jdk.compiler, Android SDK platforms;android-35 dan build-tools;35.0.0. Tetapkan ANDROID_SDK_ROOT, PNR_SIGNING_STORE, PNR_SIGNING_PASSWORD. Alias tandatangan pnr-v2. Kunci disimpan dalam kit peribadi, tidak di repo.

```sh
python3 android/build.py
```

Output `android/build/PNR-Digital-V2-Native-2.0.0.apk`. Skrip membersihkan kelas lama sebelum kompilasi supaya kelas WebView 1.0 tidak termasuk dalam keluaran 2.0.

## Batas pengesahan

Kompilasi Java/DEX, pembungkusan Android, sintaks backend dan tandatangan disemak. Tiada ujian login sebenar, emulator atau telefon dijalankan. Uji aliran borang, GPS (termasuk penolakan kebenaran), kamera, serahan, rangkaian terputus, pengesahan dan eksport sebelum penggunaan meluas. API serahan belum mempunyai idempotency; apabila respons terputus, semak Tugasan sebelum hantar semula. Tiada data bancian sebenar dimasukkan semasa pembangunan.
