# IMPLEMENTATION PLAN — BECak LISTRIK MOBILITY PLATFORM

**Target**: Peningkatan Arsitektur, Skema Database, Modul Spasial, Mesin Simulasi, Integrasi End-to-End, dan Kesiapan Demo Perlombaan  
**Fase Eksekusi**: 7 Fase Terstruktur  

---

## Roadmap Fase Implementasi

### FASE 1: Fondasi Arsitektur, Zona Operasional & Skema Database
1. **Definisi Zona Operasional Demo**:
   - Menetapkan zona demonstrasi kawasan Yogyakarta / Malioboro Heritage Zone (lat: -7.7956, lng: 110.3658, radius 3.5 km).
   - Menentukan titik pangkalan utama: *Pangkalan Malioboro Pusat*, *Depot Stasiun Tugu*, *Halte Alun-Alun Utara*, *Pasar Beringharjo*, *Taman Budaya*.
2. **Penyempurnaan Skema Prisma (`prisma/schema.prisma`)**:
   - Tambahkan field koordinat pada `Pangkalan`: `lat`, `lng`, `radiusKm`.
   - Tambahkan field koordinat dan telemetri pada `Driver`: `currentLat`, `currentLng`, `heading`, `lastActiveAt`.
   - Tambahkan field spasial & rute pada `Order`: `jemputLat`, `jemputLng`, `tujuanLat`, `tujuanLng`, `durasiMenit`, `routeGeometry` (JSON array polyline lat/lng), `simulationProgress` (0..100%).
   - Tambahkan tabel `ServicePoint` (POI dalam zona layanan pangkalan).
   - Tambahkan tabel `SystemConfig` (konfigurasi kecepatan simulasi, tarif dasar, tarif per km, faktor emisi karbon).
3. **Eksekusi Migrasi & Pembaruan Seed**:
   - Jalankan `prisma migrate` atau sinkronisasi skema MySQL.
   - Perbarui seed `prisma/seed.ts` dengan data realistis zona Yogyakarta beserta koordinat jalan sebenarnya.

---

### FASE 2: Modul Geospasial, Abstraksi Routing & Peta Interaktif
1. **Service Geospasial (`lib/geo.ts`)**:
   - Fungsi hitung jarak Haversine (jarak garis lurus untuk filter cepat).
   - Fungsi estimasi rute jalan (menggunakan OSRM OpenStreetMap public API dengan fallback cerdas algoritma interpolasi waypoint jalan lokal bila offline/gagal).
   - Fungsi interpolasi posisi dan arah sudut rotasi (*bearing*) sepanjang polyline untuk visualisasi marker becak listrik yang menghadap arah laju jalan.
2. **Komponen Peta Universal (`components/map/LeafletMap.tsx`)**:
   - Dynamic import SSR-safe untuk Leaflet di Next.js App Router.
   - Custom SVG marker yang khas untuk Becak Listrik, titik jemput (pin hijau), titik tujuan (pin oranye/merah), dan pangkalan (ikon depot listrik).
   - Layer rute polyline jalan dengan animasi pergerakan driver yang mulus (*smooth transit*).

---

### FASE 3: Mesin Simulasi Pergerakan Driver & Dispatch Service
1. **Sistem Dispatch (`lib/dispatch.ts`)**:
   - Memilih driver dari antrean pangkalan (`DriverQueue` status `MENUNGGU`) atau driver online terdekat.
   - Mengalokasikan order, mengubah status driver ke `ON_TRIP`, dan status antrean ke `DILAYANI`.
2. **Mesin Simulasi (`lib/simulation.ts` & `/api/simulation/`)**:
   - State machine siklus order:
     `MENCARI_DRIVER` → `DITERIMA` → `DIJEMPUT` (driver berjalan ke titik jemput) → `BERJALAN` (driver mengantar penumpang ke tujuan) → `SELESAI` (tiba di tujuan, pembayaran lunas, rating).
   - Endpoint simulasi `/api/simulation/step` atau auto-step yang memajukan posisi koordinat driver sepanjang rute secara presisi.
   - Panel kontrol kecepatan demo (1x = real-time, 3x = cepat, 10x = instan) dan reset skenario demo tanpa merusak data dasar.

---

### FASE 4: Refactor Halaman Pelanggan (Customer Experience)
1. **Interactive Booking Flow (`app/pelanggan/page.tsx`)**:
   - Tampilan split: Form pemesanan modern di sisi kiri + Peta interaktif Leaflet di sisi kanan.
   - Pilihan lokasi jemput & tujuan via dropdown POI cepat atau klik langsung di peta.
   - Estimasi jarak (km), durasi (menit), dan rincian tarif transparan dihitung oleh backend.
   - Mode tamu / demo selector (memungkinkan juri langsung mencoba tanpa dipaksa login).
   - Layar tracking pesanan aktif: peta menampilkan marker becak listrik bergerak mendekat ke titik jemput, lalu bergerak ke tujuan akhir, dilengkapi notifikasi status dan kalkulator emisi bersih yang dihemat.

---

### FASE 5: Refactor Dashboard Driver & Dashboard Admin
1. **Dashboard Driver (`app/driver/page.tsx`)**:
   - Toggle status online/offline tersimpan ke DB.
   - Tampilan kartu pesanan masuk dengan tombol Terima/Tolak.
   - Peta panduan rute navigasi driver langsung di dashboard.
   - Tombol status aksi ("Tiba di Titik Jemput", "Mulai Mengantar", "Selesaikan Perjalanan").
2. **Operations Center Admin (`app/admin/page.tsx`)**:
   - Peta operasional armada pangkalan (*Fleet Live Operations Map*) menampilkan semua becak listrik, depot, dan rute order aktif secara terpusat.
   - Metrik statistik bisnis & operasional riil dari query agregasi database MySQL.
   - Modul Analisis Dampak Lingkungan (Total km hijau, penghematan bahan bakar, estimasi emisi CO2 dihindari).
   - Tabel manajemen driver & armada dengan kemampuan mutasi riil ke database.
   - Bar kontrol demonstrasi (Jalankan Simulasi, Percepat Waktu, Reset Skenario Demo).

---

### FASE 6: Keamanan, API Server Validasi & Dokumentasi
1. Otorisasi server pada seluruh API routes (`/api/orders`, `/api/driver`, `/api/admin`).
2. Buat dokumentasi:
   - `docs/DATABASE_DESIGN.md` (ERD, struktur tabel, relasi, constraint).
   - `docs/SECURITY_REVIEW.md` (audit keamanan, hashing, proteksi CSRF/SQLi, sanitasi).

---

### FASE 7: Testing, Verifikasi Regresi & Final Polish
1. Script tes otomatis end-to-end simulasi order.
2. Verifikasi responsivitas layar (mobile 375px hingga desktop 1440px).
3. Pengecekan build Next.js (`npm run build`).
4. Penyusunan Laporan Akhir (Definition of Done & petunjuk presentasi lomba).
