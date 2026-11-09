# TECHNICAL AUDIT — BECAKLIK MAJALENGKA MOBILITY PLATFORM

**Tanggal Audit**: 28 Oktober 2026  
**Auditor**: Senior Full-Stack Engineering, Geospatial Systems & Security Architecture Team  
**Proyek**: BecaKlik Majalengka Mobility Platform  
**Status Repositori**: Git Branch `main`  

---

## 1. Executive Summary

Audit teknis ini dilakukan terhadap codebase **BecaKlik Majalengka** yang ditujukan untuk perlombaan teknologi mobilitas berkelanjutan dan UMKM.

### Kondisi Awal Temuan Utama:
1. **Frontend & UI Layer**: Dibangun menggunakan Next.js 16 (App Router) + React 19 + Tailwind CSS v4. UI berdesain awal yang cukup estetik, namun **halaman pelanggan, driver, dan admin masih 100% menggunakan state lokal client-side (`useState`) dan mock array statis**. Terdapat disclaimer internal: *"Mode demo · tanpa database"*.
2. **Database & ORM**: Skema Prisma 6 + MySQL sudah dirancang (`prisma/schema.prisma`) dengan model `Pangkalan`, `User`, `Driver`, `Vehicle`, `DriverQueue`, `Order`, `Payment`, `Rating`, dan `LogUnit`. Namun:
   - Database server MySQL (XAMPP) dalam keadaan belum berjalan secara default dan belum pernah dimigrasikan atau diseed di mesin lokal.
   - Model belum memiliki kolom koordinat spasial (`lat`, `lng`), batas zona operasional (`service_zones`), rute poliline perjalanan, maupun snapshot posisi realtime driver.
3. **Autentikasi & Sesi**: Terdapat utilitas custom HMAC-SHA256 cookie (`lib/auth.ts`) dan endpoint `/api/auth/login` serta `/api/auth/logout`. Namun sistem otorisasi pada layout (`app/pelanggan/layout.tsx`) memblokir akses tamu atau pengunjung demo yang ingin mencoba alur pemesanan secara langsung dari landing page.
4. **Peta & Geospasial**: Belum ada library peta sama sekali (`leaflet` belum terpasang). Belum ada rendering peta rute, pemilihan titik jemput/tujuan di peta, maupun mesin simulasi driver.
5. **Simulasi Pergerakan Driver**: Belum ada backend simulation engine. Pergerakan driver hanya simulasi tombol statis step-by-step di client tanpa sinkronisasi posisi koordinat atau status database.

---

## 2. Inventaris Stack & Dependensi Aktual

| Komponen | Spesifikasi / Library | Versi | Status Evaluasi |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 | Sangat baik untuk SSR & API route |
| Runtime UI | React & React DOM | 19.3.0 | Modern |
| Bahasa | TypeScript | 5.9.3 | Strict type checking |
| ORM | Prisma | 6.19.3 | Client & Migration Engine siap |
| Database Engine | MySQL (XAMPP MariaDB/MySQL) | 10.4.x / 8.x | Berjalan di port 3306 (`becak_listrik`) |
| Styling | Tailwind CSS v4 + Vanilla CSS tokens | 4.x | Desain responsif bertema Forest & Lime |
| Icons | Lucide React | 1.61.0 | Ikonografi modern |
| Autentikasi | Custom HMAC-SHA256 Token + Bcryptjs | 3.0.3 | Cookie-based session |
| Geospasial / Map | Leaflet + OpenStreetMap + OSRM Provider | 1.9.4+ | Baru ditambahkan, siap diintegrasikan |

---

## 3. Audit Arsitektur Direktori & Modul

```
/
├── app/
│   ├── admin/             # Layout & Admin operational dashboard (sebelumnya mock state)
│   ├── api/
│   │   ├── auth/          # Login, logout
│   │   └── health/        # Database health check
│   ├── driver/            # Layout & Driver partner dashboard (sebelumnya mock state)
│   ├── login/             # Login form (admin, driver, penumpang)
│   ├── pelanggan/         # Customer booking page (sebelumnya mock state tanpa DB)
│   ├── globals.css        # Theme styles & variables (Forest green & Lime)
│   ├── layout.tsx         # Root layout + Navbar
│   └── page.tsx           # Landing page promosi Becak Listrik
├── components/            # Komponen modular (Navbar, SectionTitle)
├── lib/
│   ├── auth.ts            # Sesi HMAC-SHA256 dan enkripsi
│   └── prisma.ts          # Singleton PrismaClient
├── prisma/
│   ├── schema.prisma      # Domain data model
│   ├── seed.ts            # Seed script demo data
│   └── migrations/        # Riwayat migrasi DDL
└── docs/                  # Dokumentasi teknis & arsitektur perlombaan
```

---

## 4. Evaluasi Alur Bisnis & Aturan Validasi

1. **Pemesanan (Customer Flow)**:
   - *Aktual*: Form hanya memiliki 2 text input alamat statis dan radio pilihan layanan Reguler/Prioritas. Tombol "Konfirmasi" hanya mengubah state React lokal tanpa memanggil endpoint backend.
   - *Rekomendasi*: Integrasikan dengan peta interaktif Leaflet. Sediakan pilihan titik POI demo (Alun-Alun, Stasiun, Malioboro/Pasar, Kampus, dsb.) atau klik langsung pada peta. Kirim payload ke endpoint API `/api/orders` yang mencatat koordinat lat/lng, estimasi jarak rute jalan, perhitungan tarif transparan di backend, dan kode booking otomatis `ORD-YYYYMMDD-XXX`.
2. **Penetapan Driver (Dispatch & FIFO Queue)**:
   - *Aktual*: Skema database memiliki tabel `driver_queue` untuk prinsip FIFO, tetapi belum ada modul dispatch service yang memproses antrean pesanan baru dan memasangkannya dengan driver yang tersedia.
   - *Rekomendasi*: Bangun `lib/dispatch.ts` yang mengevaluasi driver aktif dalam antrean FIFO pangkalan atau driver terdekat yang berstatus `ONLINE`, mengunci order secara atomik via transaksi Prisma, dan mengubah status ke `DITERIMA`.
3. **Peta & Mesin Simulasi Pergerakan Driver**:
   - *Aktual*: Tidak ada komponen peta dan tidak ada pergerakan driver berbasis rute.
   - *Rekomendasi*: Buat modul geospasial `lib/geo.ts` dengan routing interpolator (OSRM / polyline fallback akurat berbasis jalan zona operasional). Buat simulator backend/frontend state machine (`MENCARI_DRIVER` -> `DITERIMA` -> `DIJEMPUT` -> `BERJALAN` -> `SELESAI`) dengan pembaruan koordinat driver setiap interval waktu tanpa lag atau race condition.
4. **Dashboard Admin**:
   - *Aktual*: Menggunakan data hardcoded (`initialDrivers`) dengan simulasi manipulasi array di memory browser.
   - *Rekomendasi*: Hubungkan dengan query agregasi database riil (`/api/admin/stats`, `/api/admin/drivers`, `/api/admin/orders`) yang menampilkan data armada, pesanan aktif, pendapatan riil pangkalan, kontrol zona operasional, dan panel kontrol demo simulasi.
5. **Dashboard Driver**:
   - *Aktual*: Menggunakan state statis `initialOrders` di client.
   - *Rekomendasi*: Hubungkan ke sesi driver yang login (atau opsi demo switch driver). Driver dapat mengubah status online/offline, melihat order yang ditugaskan ke dirinya, menerima konfirmasi, menekan jemput, dan memantau rute navigasi.

---

## 5. Status Keamanan dan Integritas

- Password hashing menggunakan bcrypt dengan salt rounds 10 (Aman).
- Token sesi HMAC-SHA256 dengan pengecekan `timingSafeEqual` (Bagus).
- Perlu perbaikan otorisasi: API endpoint mutasi (seperti cancel, update status, tambah armada) harus memverifikasi sesi dan peran pengguna dari cookie server, bukan dari body request client.
- Nilai tarif harus dihitung di backend berdasarkan jarak terverifikasi, bukan menerima nilai rupiah mentah dari frontend pelanggan.

---

## 6. Kesimpulan Audit

Proyek memiliki fondasi Next.js dan Prisma yang bersih dan rapi. Namun terdapat jurang besar (*gap*) antara tampilan demo prototipe dan integrasi sistem nyata. Semua modul backend spasial, API mutasi booking, dispatch FIFO, simulasi rute driver, serta dashboard operasional berbasis database akan diimplementasikan secara terintegrasi pada fase berikutnya.
