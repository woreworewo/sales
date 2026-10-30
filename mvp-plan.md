# Hotel Sales CRM — MVP

Status: MVP Next.js telah diimplementasikan; demo lokal memakai SQLite; integrasi Firebase siap dikonfigurasi, belum diuji pada project live.

## Tujuan

CRM internal beberapa hotel untuk Corporate Room, Meeting/Event, dan Wedding. Versi pertama mendukung pencatatan klien, peluang bisnis, aktivitas sales, dan pemantauan follow-up.

## Cakupan versi pertama

1. Login pengguna yang diundang; tidak ada pendaftaran publik.
2. Pengaturan hotel dan penugasan akses pengguna.
3. Perusahaan dan kontak bersama dalam satu grup hotel, dengan visibilitas sesuai kewenangan pengguna.
4. Peluang bisnis per hotel dengan sales penanggung jawab.
5. Aktivitas dan tugas follow-up dengan tenggat, status selesai, dan daftar terlambat.
6. Dashboard dan laporan sederhana dengan filter hotel, sales, jenis bisnis, dan periode.

Menu: Dashboard, Klien, Peluang, Aktivitas, Laporan, Pengaturan.

## Hak akses

| Peran | Akses |
| --- | --- |
| Group Admin | Mengelola hotel, pengguna, serta seluruh data grup |
| Group Management | Membaca dashboard, data bisnis, dan laporan seluruh grup |
| Hotel Sales Manager | Mengelola peluang, aktivitas, dan penugasan tim pada hotel yang diberikan |
| Sales Executive | Mengelola peluang dan aktivitas yang ditugaskan kepadanya pada hotel yang diberikan |

Semua akses divalidasi di server. Hotel dan grup pada permintaan pengguna tidak boleh dipercaya tanpa pemeriksaan keanggotaan. Kontak bersama harus ditampilkan melalui proyeksi yang tidak membocorkan peluang atau aktivitas hotel lain. Pengguna dapat ditugaskan ke beberapa hotel.

## Data minimum

- Hotel: nama, kode, status aktif, zona waktu, mata uang.
- Pengguna: nama, email, peran, hotel yang diizinkan, status aktif.
- Perusahaan: nama, segmen, alamat, pemilik data, cakupan hotel yang boleh melihat.
- Kontak: nama, perusahaan opsional, jabatan, telepon, email, cakupan hotel. Kontak individu didukung untuk wedding.
- Peluang: judul, perusahaan/kontak, hotel, jenis bisnis, sales, tahap, sumber lead, estimasi nilai, nilai confirmed, perkiraan closing, tanggal bisnis, tindak lanjut berikutnya, alasan lost.
- Aktivitas: peluang/klien terkait, hotel, penanggung jawab, jenis aktivitas, catatan, tenggat, tanggal selesai.
- Sumber lead: website, media sosial, referral, sales visit, pameran, lainnya; nama campaign opsional.

Data utama menyimpan groupId; data operasional juga menyimpan hotelId. Simpan createdAt, updatedAt, createdBy, dan updatedBy. Perubahan tahap peluang memiliki riwayat. Nilai uang disimpan sebagai bilangan bulat dalam unit terkecil mata uang; hindari floating point.

## Detail peluang

| Jenis | Data khusus |
| --- | --- |
| Corporate Room | Jenis kontrak rate atau pemesanan, periode, jumlah kamar, malam, room nights, estimasi tarif |
| Meeting/Event | Tanggal mulai/selesai, peserta, venue, paket, kebutuhan kamar |
| Wedding | Nama pasangan/PIC, tanggal, tamu, venue, paket, kebutuhan kamar |

Pipeline: Inquiry → Qualified → Proposal Sent → Negotiation → Tentative → Won/Lost.

- Tahap boleh dilewati sesuai proses bisnis; perpindahan dicatat.
- Won mensyaratkan nilai confirmed dan tanggal konfirmasi.
- Lost mensyaratkan alasan.
- Kontrak corporate rate tidak otomatis dihitung sebagai room nights atau pendapatan confirmed. Hanya pemesanan confirmed yang dihitung sebagai bisnis confirmed.
- Tentative tidak menahan inventori kamar atau venue.
- Tanggal closing berbeda dari tanggal menginap/acara.
- Revenue aktual berada di luar versi pertama karena belum terhubung dengan PMS/keuangan.

## Dashboard dan laporan

- Nilai estimasi peluang terbuka, mengecualikan Won/Lost.
- Nilai bisnis confirmed dari peluang Won; pisahkan menurut tanggal konfirmasi atau tanggal bisnis, dengan label filter yang jelas.
- Jumlah peluang aktif, follow-up hari ini, dan follow-up terlambat.
- Conversion rate = Won / (Won + Lost) berdasarkan tanggal penutupan dalam periode; tampilkan kosong jika penyebut nol.
- Ringkasan per hotel, sales, jenis bisnis, dan sumber lead.
- Jangan menjumlahkan mata uang berbeda; MVP menggunakan satu mata uang grup yang ditentukan saat setup.

## Fondasi teknis

- Next.js App Router dan TypeScript; server components sebagai default.
- Firebase Authentication untuk identitas; sesi dan otorisasi diperiksa di server.
- Cloud Firestore sebagai sumber data utama; akses aplikasi melalui lapisan layanan server dengan validasi input.
- Firebase App Hosting untuk deployment Next.js; memerlukan billing Blaze.
- Firestore client access ditutup jika semua data melalui server. Admin SDK melewati Security Rules sehingga setiap operasi server wajib memeriksa otorisasi.
- Kueri dipaginasi dan dibatasi cakupan grup/hotel; tidak membaca seluruh koleksi untuk dashboard.
- State lokal menggunakan useState/useReducer. Tidak perlu global client state untuk MVP.
- Rahasia hanya di server dan tidak masuk Git. Pisahkan lingkungan pengembangan dan produksi.
- Cloud Storage ditambahkan ketika unggah lampiran diperlukan; lampiran belum termasuk versi pertama.

## Kriteria selesai

- Pengguna dapat membuat klien, kontak, dan peluang dengan data sesuai jenis bisnis.
- Pengguna dapat mencatat aktivitas, menjadwalkan follow-up, dan menyelesaikannya.
- Setiap penyimpanan memberikan konfirmasi; kegagalan memberikan pesan yang dapat ditindaklanjuti.
- Perubahan data tersimpan di database dan tetap tersedia setelah login ulang.
- Akses lintas hotel ditolak oleh server; diuji dengan akun dari hotel berbeda dan ID data langsung.
- Dashboard mengikuti filter serta definisi nilai bisnis yang terdokumentasi.
- Tampilan dapat digunakan di ponsel dan desktop, keyboard dapat mengakses seluruh formulir, dan loading memakai skeleton dengan ukuran stabil.
- Data demo dipisahkan dari data produksi. Login produksi tidak memiliki akun atau kata sandi bawaan.

## Urutan pengembangan

1. Kerangka aplikasi, Firebase, login, hotel, dan otorisasi.
2. Klien, kontak, serta peluang dengan tiga jenis formulir.
3. Aktivitas, follow-up, dan riwayat tahap.
4. Dashboard, laporan, pemeriksaan akses, dan deployment Firebase.

Tahap berikutnya: impor/ekspor, proposal dan lampiran, target sales, notifikasi, integrasi PMS, WhatsApp/email, serta otomatisasi marketing. Setiap tahap diprioritaskan berdasarkan penggunaan tim.

## Informasi untuk setup produksi

Nama aplikasi; daftar hotel dan zona waktunya; mata uang grup; akun admin pertama; proyek Firebase dan akun billing yang akan digunakan. Tidak diperlukan untuk menyusun fondasi lokal, tetapi diperlukan sebelum aktivasi produksi.
