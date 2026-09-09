# PNR Digital V2 — Android

Aplikasi Android hibrid untuk keseluruhan sistem percubaan di https://rpw-supabase-v2.vercel.app/.
Package: `my.pnr.digital.v2`. Android 10/API 29 dan lebih baharu. Versi 1.0.0.

## Fungsi

- Dashboard, pengesahan, tugasan, borang, SKU, pengurusan dan RPW menggunakan sistem/akses pengguna sedia ada.
- Menu asli untuk Dashboard PNR, Dashboard RPW, muat semula dan pelayar.
- GPS dengan permintaan kebenaran Android; koordinat manual jika ditolak. Ketepatan tertakluk kepada pilihan lokasi/peranti.
- Kamera sistem dan pemilih fail/gambar, termasuk berbilang gambar (maksimum 20 pilihan).
- Eksport Blob/data URL PDF, Excel, GeoJSON dan KML melalui pemilih lokasi simpanan Android, maksimum 25 MiB setiap fail. Tiada kebenaran akses keseluruhan storan.
- Pautan luar, termasuk AppSheet, dibuka menggunakan aplikasi/pelayar luar. Login perkhidmatan luar mungkin diperlukan.
- HTTPS sahaja. Tiada `addJavascriptInterface`, sijil tidak sah tidak diabaikan, WebMessagePort diberikan hanya kepada origin V2. Tiada kunci Supabase atau signing key di repo.

## Batas dan penggunaan

Ini aplikasi hibrid dengan UI sistem web, bukan penulisan semula seluruh sistem secara native. Sambungan internet diperlukan untuk log masuk pertama, mendapatkan data, pengesahan dan penyegerakan. Draf/offline bergantung kepada fungsi dan cache web sedia ada; APK tidak menjanjikan operasi penuh tanpa internet. Data aplikasi berasingan daripada Chrome; log masuk semula diperlukan. Memadam data aplikasi/uninstall boleh menghilangkan draf belum disegerakkan.

Pasang APK pada Android: buka fail APK dan benarkan pemasangan daripada sumber yang digunakan jika diminta. Nama aplikasi ialah PNR Digital V2. Pakej ditandatangani untuk pemasangan terus; bukan penerbitan Google Play. Simpan signing kit secara peribadi untuk mengemas kini app tanpa menukar identiti tandatangan.

## Bina semula

JDK 17, Android SDK `platforms;android-35` dan `build-tools;35.0.0` diperlukan. Tetapkan `ANDROID_SDK_ROOT`, `PNR_SIGNING_STORE` kepada keystore peribadi, dan `PNR_SIGNING_PASSWORD`. Alias `pnr-v2`.

```sh
python3 android/build.py
```

Output `android/build/PNR-Digital-V2-1.0.0.apk`. Untuk versi baharu, naikkan versionCode/versionName dalam manifest dan nama output dalam build.py. Jangan commit keystore/password. Kod sumber boleh dibuka sebagai projek Java sumber; skrip SDK ini ialah aliran binaan yang disediakan, bukan projek Gradle.

## Pengesahan

Kompilasi Java/DEX, pembungkusan manifest/resources dan pengesahan tandatangan APK dilakukan semasa binaan. Tiada emulator atau telefon sebenar tersedia untuk ujian hujung ke hujung. Uji login, semua peranan, GPS tepat/anggaran/ditolak, kamera/pemilih gambar, simpan/batal eksport setiap format, draf offline/sync, RPW, putaran skrin dan butang kembali sebelum pengedaran luas.
