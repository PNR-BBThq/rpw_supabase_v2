# Sambungan gambar PNR: Google Drive dan Supabase

Kod Apps Script yang dibekalkan telah disemak: `uploadImageOnly` menyimpan fail dalam
folder `UPLOAD_FOLDER_ID` dan menetapkan `ANYONE_WITH_LINK`/`VIEW`. Kod lama
`handleUpdate` memindahkan gambar yang dibuang ke Trash; API Supabase memerlukan
tindakan setara yang boleh disahkan dan dipanggil oleh pelayan sahaja.

## Pasang pada Apps Script sedia ada

Fail eksport **SISTEM DASHBOARD BANCIAN PNR (4).json** yang dikemas kini sudah
mengandungi perubahan pada fail `Code`. Jika menyalin secara manual, tambah
`gas/drive-image-bridge.gs` sebagai fail baharu dalam projek Apps Script yang
sama, kemudian tambah cabang berikut ke fungsi `processRequest`, selepas
`uploadImageOnly` dan sebelum `// 2. LALUAN BERKUNCI`:

```js
else if (action === 'deleteStoredImages') { result = pnrDeleteStoredImages_(data); }
```

Dalam **Project Settings → Script properties**, cipta `PNR_DRIVE_BRIDGE_SECRET`
dengan rentetan rawak sekurang-kurangnya 32 aksara. Masukkan **nilai yang sama**
ke Vercel Project → Settings → Environment Variables sebagai
`PNR_DRIVE_BRIDGE_SECRET` (persekitaran yang diuji). Jangan simpan nilainya dalam
Git, JSON eksport atau aplikasi Android. Pastikan `PNR_IMAGE_UPLOAD_URL` merujuk
deployment Apps Script yang **sama** dengan kod yang baru dikemas kini.

Simpan projek dan terbitkan **versi baharu deployment Web App sedia ada** dengan
hak pelaksanaan pemilik Drive. Akses mungkin memerlukan persetujuan skop Drive
yang dikemas kini. Pemadaman kekal memanggil Drive API v3 melalui
`UrlFetchApp`/`ScriptApp.getOAuthToken`; jika projek menggunakan skop nyata dalam
`appsscript.json`, pastikan `https://www.googleapis.com/auth/drive` dan
`https://www.googleapis.com/auth/script.external_request` disenaraikan dan
benarkan semula akses apabila diminta. Jika URL deployment berubah, kemas kini `PNR_IMAGE_UPLOAD_URL`
di Vercel dan terbitkan deployment web yang menggunakan tetapan baharu.

## Turutan selamat untuk pelepasan

1. Sahkan kunci `SUPABASE_SERVICE_ROLE_KEY` di pelayan dan laluan autentikasi,
   serta migrasi `sql/official-release.sql` selepas ID akaun berganda selesai.
   Migrasi `sql/drive-cleanup-queue.sql` sudah diterapkan dan jadualnya tertutup
   kepada `anon`/`authenticated`.
2. Terbitkan Apps Script dan semak satu permintaan `probe` bertandatangan melalui
   API dalam persekitaran ujian. Jangan tampal rahsia dalam konsol pelayar.
3. Cipta satu laporan ujian bergambar. Uji buka pautan dalam tetingkap tanpa
   akaun Google, sunting dan ganti gambar, semak pautan baharu, kemudian sahkan
   fail lama berada dalam Trash Drive serta tidak dirujuk lagi dalam `Data`.
4. Jika Drive tergendala selepas kemas kini pangkalan data, API memaparkan
   `cleanupPending:true`. Pentadbir boleh memanggil
   `POST /api/gdrive/retry-cleanup` dengan token sesi pentadbir untuk mencuba
   semula maksimum 20 tugasan sekali panggil. Jadual tugasan ialah rekod audit
   sehingga `completed_at` diisi; rujukan yang masih digunakan tidak dipadam.

**Penting:** pilihan pemilik ialah **padam kekal** melalui Drive API `files.delete`.
Fail yang telah dipadam tidak boleh dipulihkan daripada Trash. Uji dengan fail
gambar khas untuk ujian sebelum menerima pakai sistem secara rasmi.
Tiada rekod sebenar atau fail Drive produksi dipadam semasa penyediaan kod ini.
