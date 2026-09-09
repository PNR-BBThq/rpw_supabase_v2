# Semakan UI PNR Digital V2

Skop: PNR-BBThq/rpw_supabase_v2 sahaja. Semakan kod dashboard, penapis, borang, RPW, carta, API analitik dan navigasi. Tiada migrasi, panggilan data sebenar, perubahan konfigurasi Supabase atau perubahan repo live.

## Dilaksanakan

- Hierarki dashboard: KPI dahulu, ringkasan skop tapisan, analisis, taburan dan rekod; pautan terus ke bahagian.
- Tema konsisten dengan permukaan putih, hijau gelap, sempadan ringan, nombor jelas dan kawalan responsif. Digunakan juga pada borang dan RPW.
- Label membezakan bilangan rekod daripada lokasi; luas bertanam daripada keluasan unik bancian. Nota pertindihan kawasan untuk lawatan berulang / pelbagai perosak.
- Keadaan tiada rekod dibezakan daripada tiada luas serangan. Tiada dakwaan lokasi selamat berdasarkan ketiadaan data.
- Hotspot menggunakan daerah bersama negeri; semakan kedua-dua koordinat dan julat sah.
- Carian jadual ditangguh 180 ms selepas input; carta keterukan menggunakan semula instance tanpa animasi kemas kini.
- Ringkasan beralih secara manual untuk memberi masa membaca; navigasi menu dengan Enter/Space dan fokus papan kekunci.
- Reset tapisan hanya mengosongkan tarikh dashboard, bukan semua medan tarikh dalam halaman.
- Pembetulan paparan julat tarikh yang sebelum ini bercanggah dengan kelas Bootstrap d-inline-flex.

## Keutamaan seterusnya

| Bahagian | Penemuan kod | Cadangan |
|---|---|---|
| Prestasi Supabase | analytics.js mengambil semua rekod disahkan secara berkelompok 1,000 dan select('*') | Agregasi KPI/carta di DB; penapis dan pagination di pelayan, endpoint butiran berasingan. Ukur masa dan payload sebelum/selepas. |
| Skop akses | Endpoint analitik menerima state daripada permintaan; cache dashboard menggunakan kunci umum | Ikat skop kepada identiti pada pelayan dan asingkan cache mengikut pengguna/skop. Audit seluruh endpoint bersama RLS sebelum pengeluaran. |
| Borang lapangan | Borang panjang dengan bahagian A–D | Tambah kemajuan pengisian dan ringkasan ralat yang membawa ke medan, selepas ujian draf/offline. |
| Pengesahan/tugasan | Modul dan penapis dikongsi, kad berasingan | Paparkan kiraan tugasan, masa menunggu dan alasan penolakan pada titik tindakan; semak akses mengikut peranan. |
| Eksport | Pustaka Excel/PDF dimuat ketika membuka dashboard | Muat atas permintaan dengan status dan cuba semula; kekalkan sokongan offline. |
| RPW | Halaman tersendiri dan logik tertanam yang besar | Pecahkan pengurusan data/peta/paparan; ukur masa muat dan saiz marker. Tema sahaja diubah dalam iterasi ini. |
| Ketepatan metrik | Jumlah luas boleh bertindih; borang turut mengenal unit bukan hektar | Sahkan definisi penyebut, lawatan berulang dan unit sebelum memperkenalkan kadar insiden/keluasan unik. |
| Kebolehcapaian | Banyak jadual/kad masih menggunakan handler klik dan teks inline kecil | Audit papan kekunci, pembaca skrin dan zoom 200% seluruh modul. |

## Pengesahan dan batas

Semakan sintaks JavaScript, rujukan aset tempatan, ID unik dashboard, dan fixture logik dashboard (tiada data, sifar serangan, angka teks, koordinat tidak sah, daerah nama sama di negeri berlainan). Tiada ujian pelayar atau sesi log masuk Supabase sebenar; perubahan ini perlu percubaan pengguna pada V2. Tiada angka peningkatan prestasi didakwa tanpa pengukuran.
