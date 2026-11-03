# Gocrot Trans — Validasi Kwitansi Komunitas

Sistem ini mencatat perjalanan taksi lewat bot WhatsApp, lalu siapa pun bisa memeriksa nomor seri di halaman publik. Semua komponen memakai layanan gratis.

| Bagian | Tempat | Peran |
| --- | --- | --- |
| Database, login admin, function, situs web | Appwrite Cloud Free | Satu-satunya backend |
| Bot WhatsApp | Render Free Web Service | Proses yang hidup terus, di luar Appwrite Functions |
| Pembacaan chat | Gemini 2.0 Flash, cadangan Groq | Hanya mengekstrak rute dan tarif |

Bot tidak berjalan di Appwrite Functions. Functions mati dalam hitungan detik, sedangkan Baileys butuh koneksi WebSocket yang tetap terbuka. Situs web juga tidak berjalan di Render. Render hanya untuk bot.

## Yang ada di repositori

- `bot/` — server Express + Baileys + Gemini.
- `functions/kwitansi/` — satu Appwrite Function untuk membuat nomor seri dan memeriksa kwitansi.
- `web/` — Next.js 14: `/validasi` tanpa login, `/admin/login`, dan `/admin/dashboard`.
- `render.yaml` — blueprint Render untuk bot.

Paket gratis Appwrite hanya menyediakan **1 database, 1 bucket, dan 2 function**. Proyek ini memakai satu database (`main`), satu bucket (`baileys-auth`), dan satu function (`kwitansi`). Jangan menambah bucket atau function lain di proyek yang sama.

Nomor seri selalu dibuat function, dengan bentuk `A7K2-0001` (awalan acak 4 karakter + nomor urut). AI tidak pernah membuat nomor seri, tarif, atau lokasi. Kalau ragu, bot menanyakan pengemudi.

## 1. Proyek Appwrite

1. Buat akun di [cloud.appwrite.io](https://cloud.appwrite.io) dan buat proyek pada paket Free. Pilih region terdekat, misalnya Singapore.
2. Catat **Project ID** dan endpoint region. Contoh Singapore: `https://sgp.cloud.appwrite.io/v1`. Jangan memakai `https://cloud.appwrite.io/v1` untuk API proyek.
3. Di **Auth**, nyalakan login email/password.
4. Buat user admin, lalu pada user itu tambahkan label persis `admin`. Tanpa label ini dashboard menolak masuk.
5. Di **Overview → Integrations → Platforms**, tambah platform Web untuk `localhost` dan, nanti, hostname situs Appwrite.
6. Buat API key sementara untuk menyiapkan skema. Centang:
   - `databases.read`, `databases.write`
   - `tables.read`, `tables.write`
   - `columns.read`, `columns.write`
   - `indexes.read`, `indexes.write`
   - `rows.read`, `rows.write`
   - `buckets.read`, `buckets.write`
   - `files.read`, `files.write`

Salin `bot/.env.example` menjadi `bot/.env`, isi endpoint, project ID, dan API key itu, lalu jalankan:

```bash
cd bot
npm install
npm run setup
```

Skrip itu membuat database `main`, tabel di bawah ini, indeks, dan bucket `baileys-auth`. Skrip boleh dijalankan ulang. Yang sudah ada dilewati.

| Tabel | Isi |
| --- | --- |
| `drivers` | Nomor WhatsApp (sekaligus ID baris), nama, status aktif |
| `series` | Nomor seri, status `available` / `used` / `blocked` |
| `trips` | Perjalanan yang sudah dikonfirmasi. Tarif disimpan sebagai integer Rupiah |
| `chat_logs` | Setiap pesan masuk dan keluar |
| `sessions` | Draf percakapan, supaya restart Render tidak menghilangkan konfirmasi |
| `admins` | Nama dan email admin, diisi saat login |
| `meta` | Heartbeat. Bot menulisnya saat `/health` dipanggil, supaya proyek tidak tidur karena tidak ada aktivitas |

Tabel hanya bisa dibaca admin yang sedang login. Pengunjung halaman validasi tidak bisa menelusuri daftar perjalanan. Mereka hanya menerima satu nomor yang dikirim ke function.

Bucket `baileys-auth` tidak diberi izin publik. Isinya satu berkas JSON sesi WhatsApp. Ini satu-satunya bucket yang boleh ada di proyek gratis.

Setelah skema jadi, buat API key kedua yang lebih sempit untuk bot. Centang hanya `rows.read`, `rows.write`, `tables.read`, `databases.read`, `files.read`, `files.write`, dan `buckets.read`. Simpan key ini untuk Render. Key penyiapan skema boleh dihapus.

## 2. Function kwitansi

Di konsol: **Functions → Create function**.

- Nama: `kwitansi`
- ID: `kwitansi`
- Runtime: Node.js 20
- Entrypoint: `src/main.js`
- Folder sumber: `functions/kwitansi`
- Perintah build: `npm install`
- Timeout: 30 detik
- Hak eksekusi: **Any** (halaman publik harus bisa memanggilnya)
- Scope: `users.read`, `rows.read`, `rows.write`, `tables.read`, `databases.read`
- Variable: `APPWRITE_DATABASE_ID` = `main`

`APPWRITE_FUNCTION_API_ENDPOINT` dan `APPWRITE_FUNCTION_PROJECT_ID` diisi Appwrite sendiri. Jangan menyalin API key ke variable function.

Function ini punya dua aksi:

- `validate` — siapa pun boleh. Mengembalikan satu nomor seri.
- `generate` — hanya user dengan label `admin`.

Pemanggilan sinkron dibatasi 30 detik. Dashboard memotong permintaan besar menjadi beberapa panggilan (maksimal 200 nomor sekali jalan, satu buku tetap satu awalan). Satu awalan paling banyak 9999 nomor.

Hasil halaman `/validasi`:

- **Valid** (hijau): nomor sudah terpakai dan perjalanan ditemukan. Ini kwitansi yang sah. Yang ditampilkan: asal, tujuan, total, nama pengemudi, waktu, dan rincian kalau ada. Nomor WhatsApp pengemudi tidak ditampilkan.
- **Tidak ditemukan** (merah): nomor tidak ada.
- **Belum dipakai** (kuning): nomor ada di buku, tetapi belum ada perjalanan.
- **Diblokir** (kuning): admin memblokir nomor itu.
- **Sudah terpakai** (kuning): status terpakai, tetapi data perjalanannya hilang. Waktu pemakaian tetap ditampilkan.

## 3. Kunci Gemini gratis

1. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey) dengan akun Google.
2. Buat API key pada paket gratis.
3. Simpan sebagai `GEMINI_API_KEY`.

Model bawaan adalah `gemini-2.0-flash`. Kalau Google menonaktifkan nama model itu, ubah `GEMINI_MODEL` ke model Flash gratis yang masih aktif. Jangan diganti ke API berbayar.

`GROQ_API_KEY` bersifat cadangan. Buat key gratis di [console.groq.com](https://console.groq.com). Bot baru memakai Groq jika Gemini gagal atau key Gemini kosong. Kalau keduanya kosong, bot meminta pengemudi mengirim ulang dan tidak mengarang data.

AI hanya mengembalikan JSON: asal, tujuan, total integer, rincian opsional (tol, bensin, parkir, lain), tingkat keyakinan, dan daftar field yang belum ada. `700rb`, `700k`, dan `1,5jt` dijelaskan di instruksi AI, bukan dihardcode di bot.

## 4. Bot di Render

1. Push repositori ini ke GitHub, GitLab, atau Bitbucket.
2. Di [render.com](https://render.com), buat **Blueprint** dari `render.yaml`, atau buat **Web Service** secara manual:
   - Root directory: `bot`
   - Runtime: Node 20
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Plan: Free
   - Health check path: `/health`
3. Isi environment dari `bot/.env.example`. `PORT` diisi Render sendiri.
4. `PUBLIC_VALIDATE_URL` diisi setelah situs jadi, misalnya `https://nama-anda.appwrite.network/validasi`.
5. Deploy. Buka **Logs**. Saat belum ada sesi, QR muncul di log. Di ponsel komunitas: WhatsApp → Perangkat tertaut → Tautkan perangkat, lalu pindai QR itu.
6. Setelah tersambung, log menulis `[wa] terhubung`. Sesi disimpan ke bucket Appwrite, bukan ke disk Render.

Render Free tidur setelah sekitar 15 menit tanpa traffic masuk, dan disk-nya hilang setiap restart. Bot menangani itu seperti ini:

- `GET /health` menjawab `200` dengan `{"ok":true}` segera, tanpa menunggu WhatsApp.
- Saat proses hidup, sesi dimuat dari Appwrite **sebelum** soket Baileys dibuat.
- Setiap pembaruan kredensial disimpan kembali ke bucket. Perubahan kunci sinyal dikumpulkan sebentar, lalu ikut disimpan. Sebelum proses berhenti, bot menyimpan sesi sekali lagi.
- Kalau koneksi putus, bot menyambung lagi dengan jeda 1, 2, 4 … sampai 60 detik, memakai sesi yang sama.
- Kalau perangkat ditautkan dihapus dari WhatsApp, berkas sesi dihapus dan QR baru dicetak di log.

Jangan memakai background worker. Paket Free hanya menyediakan Web Service. Jangan mengandalkan `/robots.txt` untuk membangunkan layanan: Render mencegat path itu, jadi proses bot tidak ikut hidup.

### Cron supaya bot tidak tidur

Pakai [cron-job.org](https://cron-job.org) atau UptimeRobot, keduanya gratis.

- URL: `https://NAMA-SERVICE.onrender.com/health`
- Jadwal: setiap 10 menit (`*/10 * * * *`)
- Method: GET
- Anggap sukses kalau status HTTP 200

Ping ini juga menulis heartbeat ke tabel `meta`, paling sering sekali tiap 9 menit, supaya proyek Appwrite tidak dijeda karena sepi.

## 5. Situs di Appwrite Sites

1. **Sites → Create site**. Framework: Next.js. Root directory: `web`.
2. Perintah install: `npm install`. Perintah build: `npm run build`.
3. Isi variable dari `web/.env.example` **sebelum** build pertama. Nilai `NEXT_PUBLIC_*` dikunci saat build. Kalau diubah, deploy ulang.
4. Tambahkan hostname situs (bentuknya `sesuatu.appwrite.network`) sebagai platform Web di proyek Appwrite. Tanpa ini browser memblokir login dan validasi.
5. Buka `/validasi` dari ponsel. QR yang dicetak di setiap kwitansi mengarah ke halaman yang sama. Penumpang mengetik nomor seri.

Dashboard admin:

- **Perjalanan** — cari, saring tanggal (waktu Jakarta) dan pengemudi, unduh CSV atau Excel.
- **Pengemudi** — tambah, ubah nama, aktif/nonaktif. Nomor disimpan sebagai `62…`.
- **Nomor seri** — buat sekaligus, saring status, blokir buku yang hilang. Nomor yang sudah terpakai tidak bisa diblokir dari tombol itu.
- **Log chat** — untuk sengketa, misalnya pengemudi menulis 700rb tetapi yang tercatat berbeda.

## Alur bot

Hanya nomor yang terdaftar dan aktif yang dilayani. Nomor lain mendapat pesan untuk menghubungi admin.

1. Pengemudi mengirim kalimat biasa, misalnya `Dari pool bus Primajasa Cikopo ke Bandara Soekarno Hatta total 700rb`.
2. Kalau asal, tujuan, atau total belum ada, bot menanyakan bagian itu saja, lalu membaca ulang seluruh percakapan.
3. Kalau ketiganya ada, bot menampilkan ringkasan dan menunggu `YA` atau `TIDAK`. Keyakinan rendah tetap dimintai cek, dengan peringatan.
4. `YA` baru mengambil nomor seri `available` terawal, menyimpan perjalanan, dan mengubah seri menjadi `used`.
5. `TIDAK` atau `BATAL` membuang draf. Perjalanan yang sudah tercatat tidak ikut terhapus.
6. Balasan sukses menaruh nomor seri di baris sendiri supaya mudah disalin, plus instruksi menulisnya di kwitansi kertas.

Draf disimpan di tabel `sessions`. Kalau Render restart tepat setelah nomor tercatat tetapi sebelum balasan terkirim, pesan `YA` berikutnya mengirim nomor yang sama dan tidak mengambil nomor baru.

Setiap pesan masuk dan keluar ditulis ke `chat_logs`.

## Pengembangan di laptop

```bash
cd bot
npm install
npm test
npm run dev
```

`npm test` memeriksa normalisasi nomor, kata YA/TIDAK, dan pembersihan jawaban AI. Bot tetap membutuhkan `.env` dan QR di terminal untuk tersambung ke WhatsApp.

```bash
cd web
npm install
npm run dev
```

Salin `web/.env.example` menjadi `web/.env.local` sebelum `npm run dev`.

## Batas yang disengaja

- Satu layanan Render. Jangan menambah worker atau situs kedua di workspace yang sama kalau bot harus hidup sebulan penuh. Paket Free memberi 750 jam instance per workspace.
- RAM bot 512 MB. Riwayat chat WhatsApp tidak diunduh.
- Foto kwitansi tidak dibaca. Pengemudi mengirim teks.
- Ekspor dashboard dibatasi 1000 perjalanan sekali unduh, supaya kuota baca bulanan tidak habis.
- Tidak ada WhatsApp Cloud API dan tidak ada API model berbayar.
