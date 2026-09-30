# PNR — Pendaftaran Supabase Auth dan audit pengguna

## Perubahan 30 September 2026
- Jadual `user` dan `session_logs` sedia ada diperluas. Tiada rekod bancian/pengguna lama dipindahkan atau dipadam.
- `user.auth_user_id` memautkan profil kepada `auth.users`; kata laluan akaun baharu dikendalikan Supabase Auth dan tidak disalin ke `user.pwd`.
- Pendaftaran memerlukan e-mel, nama, No. K/P, jawatan, negeri, ID dan kata laluan minimum 12 aksara.
- Trigger Auth mencipta profil dengan peranan STAFF dan status MENUNGGU. Metadata pengguna tidak boleh menetapkan peranan/status.
- Pengesahan e-mel dan kelulusan admin diperlukan sebelum akses API. Akaun digantung disekat pada setiap permintaan.
- Admin boleh melihat e-mel pengguna, meluluskan atau menolak melalui Pengurusan Pengguna. Kelulusan sebelum e-mel disahkan disekat juga pada aras pangkalan data.
- `activity_logs` merekod identiti pelayan, sesi, masa, API, keputusan dan ID rekod. Kata laluan, token, No. K/P dan kandungan gambar tidak direkodkan.
- Log sesi menyimpan masa log masuk, penggunaan terakhir dan log keluar. Kunci sesi ialah hash, bukan token.
- Admin boleh menapis log ikut ID pengguna/tarikh, memilih sesi atau aktiviti, dengan 50 rekod setiap halaman.
- Aktiviti UI berawalan CLIENT ialah laporan daripada pelayar, bukan bukti perubahan pangkalan data. Eksport pelayar direkod sebagai permintaan eksport, bukan pengesahan fail berjaya dijana.
- Aktiviti tanpa internet dan percubaan log masuk gagal belum termasuk dalam audit identiti. Log API hanya meliputi permintaan yang dikenal pasti penggunanya.
- JWT Supabase diperbaharui secara automatik pada web. APK 2.2 lama boleh menggunakan endpoint login yang sama; selepas JWT tamat ia meminta log masuk semula. Pendaftaran APK lama membuka borang web. APK lama belum menghantar log pertukaran skrin/log keluar kepada API.

## Migrasi pengguna lama
Semakan awal mendapati 135 pengguna sedia ada, 0 e-mel profil dan 0 akaun Supabase Auth. Akaun lama kekal boleh log masuk bagi mengelakkan semua pengguna terkunci. Peralihan kepada Supabase Auth sahaja belum lengkap sehingga e-mel/identiti pengguna lama disahkan dan akaun mereka dipautkan. Jangan memadankan e-mel berdasarkan nama sahaja atau mengesahkan e-mel secara automatik.

## Konfigurasi e-mel yang perlu disahkan
- Supabase Auth: pengesahan e-mel perlu dihidupkan.
- Site URL/redirect yang dibenarkan: https://rpw-supabase-v2.vercel.app/
- Untuk pendaftaran pegawai secara meluas, semak penyedia SMTP. Penghantaran e-mel sebenar dan konfigurasi SMTP belum disahkan melalui ujian akaun sebenar.
- Jangan letakkan service_role key dalam frontend/APK. Key kekal pada API Vercel sahaja.

## Semakan penerimaan
1. Daftar e-mel ujian milik sendiri. Profil mesti STAFF/MENUNGGU, kata laluan profil NULL.
2. Cuba log masuk dan kelulusan admin sebelum pengesahan e-mel: kedua-duanya mesti disekat.
3. Sahkan e-mel, kemudian luluskan oleh admin. Log masuk menggunakan e-mel.
4. Buka modul, hantar bancian ujian, kemas kini dan semak log sesi/aktiviti sebagai admin.
5. Gantung pengguna; permintaan berikutnya mesti ditolak. STAFF tidak boleh membaca log atau meluluskan pengguna.
6. Log keluar; sesi lama mesti ditolak walaupun token belum tamat.
7. Semak pembaharuan sesi web; ID sesi log mesti kekal sama.

## Pengesahan automatik
Ujian kod meliputi pengesahan identiti, e-mel, kelulusan, peranan, sesi ditamatkan, penggiliran JWT dan pengecualian rahsia daripada log. Ujian transaksi Supabase mencipta akaun sintetik sementara, memastikan status STAFF/MENUNGGU dan sekatan kelulusan sebelum e-mel disahkan, kemudian ROLLBACK semua data ujian. RLS serta larangan akses langsung anon/authenticated disemak.

Log tidak mempunyai polisi pemadaman automatik setakat ini. Tempoh simpanan perlu diputuskan pemilik sistem sebelum rutin pembersihan diperkenalkan.
