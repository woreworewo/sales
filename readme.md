# Sales · Hotel CRM

CRM MVP multi-hotel, Next.js App Router + TypeScript + Firebase. UI Bahasa Indonesia, responsive, compact, dan calm. Hotel dipilih melalui **Akun**, bukan header.

## Menjalankan lokal

Node.js 22.13+ (Node 22 LTS direkomendasikan).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1
```

Buka [localhost:3000](http://localhost:3000). Demo menyediakan akun admin, manager, sales, dan viewer. Data serta foto disimpan pada SQLite di `.data/`, bertahan setelah refresh/restart, dan tidak masuk Git. `node:sqlite` dapat menampilkan experimental warning pada Node 22/24; ini bukan kegagalan aplikasi. Mode demo hanya diizinkan pada localhost dan ditolak pada Firebase App Hosting/Cloud Run.

## Fitur

- Dashboard: pipeline aktif, bisnis confirmed, prioritas follow-up.
- Klien: perusahaan, kontak/PIC, segmen, hotel yang dibagikan.
- Peluang: Corporate Room, Meeting/Event, Wedding; sumber lead; tahap dan riwayat perubahan; nilai, tanggal bisnis dan closing.
- Aktivitas: sales call, WhatsApp, email, sales visit, site inspection. Alur data/bukti → hasil → tinjau/simpan; aktivitas dapat dikonversi menjadi peluang.
- Visit: foto kamera/galeri dikompresi di perangkat, koordinat GPS dan akurasi atas permintaan pengguna. Foto privat melalui endpoint yang memeriksa akses. Lokasi dan foto tidak dianggap bukti anti-pemalsuan.
- Follow-up: hari ini, terlambat, seluruh tugas, riwayat; pencatatan hasil menyelesaikan tugas lama dan dapat membuat tugas baru secara atomik.
- Laporan per hotel dan sumber lead. Conversion = Won/(Won+Lost), periode berdasarkan tanggal closing. Kontrak corporate rate tanpa komitmen kamar tidak dihitung sebagai confirmed; confirmed bukan revenue aktual.
- Admin: hotel, zona waktu, pengguna aktif/nonaktif, peran berbeda per hotel.
- Semua penyimpanan memberi konfirmasi atau pesan validasi tanpa menghapus isian; versi record mencegah menimpa perubahan dari sesi lain. Receipt transaksi per pengiriman mencegah duplikasi saat submit dicoba ulang.

## Hak akses

| Peran | Akses |
| --- | --- |
| Group Admin | Seluruh hotel, pengguna, dan pengaturan |
| Sales Manager | Peluang dan aktivitas tim pada hotel yang diberikan |
| Sales Executive | Peluang, aktivitas, serta tugas yang ditugaskan kepadanya |
| Viewer | Hanya membaca data hotel yang diberikan |

Satu user dapat menjadi manager di Jakarta dan sales di Bandung. Database merupakan sumber kebenaran. Profil/keanggotaan diperiksa ulang di transaksi server setiap mutasi; filter tampilan bukan pengamanan. Klien bersama dapat dilihat pada hotel yang diberikan, tanpa membuka riwayat bisnis hotel lain. Menghapus centang hotel pada klien yang sudah tersimpan tidak mencabut tautan lama; tautan dipertahankan agar riwayat tidak terputus.

## Mengaktifkan Firebase

1. Buat project Firebase, aktifkan billing Blaze, Firestore Native Mode, Cloud Storage, dan Authentication dengan provider **Google**. Tentukan lokasi database/storage sebelum pembuatan. Tambahkan domain aplikasi pada Authorized Domains di Authentication.
2. Buat Firebase Web App dan isi variabel `.env.local` dari `.env.example`. Set `CRM_DEMO_MODE=false`, project ID, nama bucket, konfigurasi web, `CRM_GROUP_ID`, dan `APP_ORIGIN` ke origin HTTPS aplikasi yang tepat. Konfigurasi web Firebase bukan service-account secret.
3. Sediakan Application Default Credentials secara lokal melalui Google Cloud CLI, atau `GOOGLE_APPLICATION_CREDENTIALS` menunjuk file service account **di luar repository**. Jangan commit kunci. App Hosting menggunakan service account runtime/ADC.
4. Isi `BOOTSTRAP_ADMIN_EMAIL` secara lokal. Jalankan `npm run bootstrap` untuk membuat/memperbarui profil Group Admin pada grup. Script tidak mengirim email dan tidak membuat data bisnis contoh. Pengguna harus login dengan email Google yang sama.
5. Deploy aturan dan index melalui Firebase CLI resmi:

   ```powershell
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage --project YOUR_PROJECT_ID
   ```

   Firestore dan Storage client-side ditutup. Admin SDK server memeriksa akses sendiri. Tunggu seluruh composite index selesai dibangun sebelum pengujian.
6. Buat backend **Firebase App Hosting**, hubungkan repository/branch, root `/`. Set environment konfigurasi di backend: `APP_ORIGIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, semua `NEXT_PUBLIC_FIREBASE_*`, serta `CRM_GROUP_ID`. Nilai `NEXT_PUBLIC_*` diperlukan pada BUILD. `apphosting.yaml` menonaktifkan demo. Gunakan runtime Node 22 yang kompatibel dengan dependency lock.
7. Pastikan service account backend hanya memiliki akses yang diperlukan pada project: Firestore (Datastore User), Firebase Authentication Admin untuk provisioning user/session, dan akses object Storage pada bucket bukti. Jangan memberikan role Owner.
8. Jalankan bootstrap, login admin, tambah hotel, lalu tambah profil user dan akses hotel. Jika hostname baru diketahui setelah rollout pertama, perbarui `APP_ORIGIN`, Authorized Domains, dan lakukan rollout ulang. Sesi produksi memakai cookie HttpOnly + Secure + SameSite serta verifikasi revocation.

Belum ada project Firebase yang diikat ke repository. Login cloud, upload Cloud Storage, dan rollout Firebase memerlukan project/config/credentials pengguna; belum diverifikasi terhadap project live.

Dokumentasi resmi: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting), [konfigurasi backend](https://firebase.google.com/docs/app-hosting/configure), [session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies).

## Struktur

```text
src/app/                  RSC pages, server actions, session/evidence route handlers
src/components/           UI, formulir lokal, photo/GPS capture
src/lib/access.ts         Kebijakan hak akses (unit tests bersebelahan)
src/lib/validation.ts     Validasi server dan signature foto
src/lib/database.ts       Firestore adapter; SQLite khusus demo lokal
src/lib/service.ts        Pembacaan data yang dibatasi hotel/peran
scripts/bootstrap.ts      Setup admin pertama dengan ADC
```

Untuk MVP, pembacaan dibatasi 100 record terbaru per jenis/per hotel, 100 pengguna dan 100 hotel; daftar dipaginasi 20 baris. Jika batas terlampaui, UI menampilkan peringatan bahwa ringkasan/laporan hanya mencakup data yang dimuat. Sebelum volume tersebut terlampaui, tambahkan cursor pagination dan agregat server untuk laporan lengkap. Ini batas eksplisit, bukan laporan seluruh database tanpa batas.

Belum termasuk PMS, pembayaran, pengiriman campaign, WhatsApp API, lampiran proposal, push notification, dan verifikasi anti-spoofing lokasi. Data foto/lokasi hanya dikumpulkan saat pengguna melakukan kunjungan; tidak ada background tracking. Atur kebijakan retensi dan backup sesuai kebutuhan operasional sebelum menyimpan data produksi.

## Verifikasi

```powershell
npm run typecheck
npm test
npm run build
```

CI menjalankan tiga pemeriksaan tersebut. Unit tests mencakup isolasi lintas hotel, batas ownership, viewer/nonaktif, Won/Lost, nilai uang, kalender, foto, koordinat, dan perhitungan laporan. Pengujian browser lokal mencakup login, penyimpanan klien/visit, follow-up, serta navigasi role. Uji integrasi Firebase live tetap perlu dilakukan setelah project tersedia.
