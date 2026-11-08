# PRODUCT GAP ANALYSIS — BECak LISTRIK MOBILITY PLATFORM

**Target Evaluasi**: Kesiapan Prototipe untuk Demonstrasi Perlombaan Teknologi Mobilitas Berkelanjutan  
**Tanggal**: 28 Oktober 2026  
**Status**: DRAFT AUDIT & MATRIX PERBAIKAN  

---

## 1. Matriks Gap Analisis Fitur

| Area / Fitur | Harapan Master Spec Perlombaan | Kondisi Aktual Codebase Awal | Tingkat Kesenjangan (Gap) | Solusi & Aksi Teknis |
|---|---|---|---|---|
| **Alur Pemesanan Pelanggan** | Form booking berbasis peta, estimasi jarak jalan, durasi & tarif riil dari backend, kode booking DB, live tracking perjalanan. | Form statis text-only, tarif hardcoded `12000/18000`, kode booking dibuat via `Math.random()`, tanpa penyimpanan DB. | **KRITIS (High)** | Bangun halaman pemesanan dengan peta Leaflet, integrasi geocoding & POI pangkalan, API `/api/orders` dengan kalkulasi tarif di backend, tracking ID tersambung DB. |
| **Peta Interaktif Spasial** | Peta Leaflet dengan marker pangkalan, POI, rute poliline jalan, marker driver berputar (heading) mengikuti jalan. | Belum ada peta sama sekali di seluruh aplikasi. | **KRITIS (High)** | Buat komponen `InteractiveMap` (Leaflet + OpenStreetMap) dengan tile layer responsif, marker custom becak listrik, rute polyline jalan, dan zona geofence pangkalan. |
| **Mesin Simulasi Gerakan Driver** | Pergerakan driver terhubung ke status backend (`MENCARI_DRIVER` → `DITERIMA` → `DIJEMPUT` → `BERJALAN` → `SELESAI`) dengan interpolasi rute jalan berkecepatan dinamis. | Hanya tombol klik manual yang menambah indeks array statis di memory React client. | **KRITIS (High)** | Bangun simulator geospasial (`lib/simulation.ts` + `/api/simulation/tick`) yang menginterpolasi posisi lat/lng driver di sepanjang polyline rute jalan riil dengan kontrol kecepatan demo (1x, 2x, 5x, Auto). |
| **Sistem Dispatch & Antrean Driver** | Alokasi pesanan berbasis antrean pangkalan FIFO (`driver_queue`) atau jarak radius zona terdekat. Transaksi atomik database. | Tabel `driver_queue` sudah ada di Prisma, tetapi belum ada kode backend yang mengeksekusinya. | **TINGGI (High)** | Implementasikan `lib/dispatch.ts` untuk memilih driver pertama yang `MENUNGGU` pada antrean pangkalan dan menugaskannya secara transaksional ke pesanan baru. |
| **Database & Skema Data** | Tabel memuat koordinat spasial (`lat`, `lng`), batas zona operasional pangkalan, titik POI, snapshot rute, histori emisi karbon. | Skema awal belum memiliki kolom `lat`/`lng` di `pangkalan`, `orders`, maupun `drivers`. Belum ada tabel `service_points` / POI. | **TINGGI (High)** | Perluas skema Prisma dengan field koordinat, poliline snapshot, dan migrasikan ke MySQL `becak_listrik`. |
| **Dashboard Operasional Admin** | Menampilkan metrik riil dari DB (pesanan hari ini, pendapatan aktual, armada aktif, utilisasi pangkalan), live map armada, kontrol demo. | Menggunakan mock array `initialDrivers` dan angka hardcoded. Tambah driver hanya masuk ke state lokal browser. | **TINGGI (High)** | Sambungkan Admin Page ke endpoint agregasi DB `/api/admin/metrics`, `/api/admin/drivers`, peta monitoring posisi armada realtime, dan panel kontrol demo. |
| **Dashboard Mitra Driver** | Driver online/offline toggle tersimpan ke DB, daftar pesanan masuk riil, panduan rute navigasi, rekap pendapatan per order. | Menggunakan state lokal, tombol advance hanya simulasi state statis. | **SEDANG (Medium)** | Sambungkan status online/offline ke tabel `drivers`, tampilkan order aktif yang ditugaskan ke driver tersebut, dan sediakan peta rute jemput/tujuan. |
| **Kalkulator Dampak Lingkungan (Eco Analytics)** | Menghitung jarak bersih (km), kWh energi listrik yang dikonsumsi, dan estimasi CO2 yang dihindari vs kendaraan bensin/motor konvensional dengan parameter transparan. | Belum diimplementasikan sama sekali. | **SEDANG (Medium)** | Tambahkan modul `lib/eco.ts` dengan faktor emisi IPCC/ESDM (Becak Listrik: ~0.035 kWh/km vs Sepeda Motor Bensin: ~95 g CO2/km) dan widget dampak lingkungan di Admin & Pelanggan. |
| **Aksesibilitas Demo / Guest Mode** | Pengunjung / Juri lomba dapat langsung mencoba booking demo tanpa harus repot login akun, atau dapat berganti role dengan satu klik. | Halaman `/pelanggan` me-redirect tamu ke `/login`. Akun admin/driver tidak bisa membuka `/pelanggan`. | **TINGGI (High)** | Sediakan Guest Checkout / Quick Demo Persona switcher agar juri dapat mendemonstrasikan sistem tanpa hambatan autentikasi. |

---

## 2. Analisis Kebutuhan Lomba GTNIC

Juri perlombaan teknologi membutuhkan:
1. **Bukti Sistem Riil (Bukan sekadar mockup Figma/HTML)**: Database MySQL dan Prisma harus benar-benar menyimpan dan mengembalikan data transaksi pesanan.
2. **Karakter Becak Listrik yang Unik**: Identitas kendaraan roda tiga listrik ramah lingkungan untuk mobilitas lokal kawasan (kampus / cagar budaya / pariwisata).
3. **Simulasi yang Stabil & Jujur**: Gerakan driver harus mulus mengikuti belokan jalan, namun secara transparan berlabel *"Simulasi Telemetri & Rute"* tanpa klaim palsu integrasi hardware IoT GPS riil.
4. **Keamanan & Konsistensi**: Validasi backend pada harga, koordinat, dan status order.
