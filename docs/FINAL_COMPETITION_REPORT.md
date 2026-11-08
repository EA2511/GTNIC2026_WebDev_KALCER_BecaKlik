# LAPORAN AKHIR — BECak LISTRIK MOBILITY PLATFORM (LAJUKOTA)
## Rekayasa Perangkat Lunak, Geospasial, & Platform Simulasi Siap Perlombaan GTNIC 2026

**Klasifikasi**: Final Engineering & Competition Demonstration Report  
**Tanggal**: 28 Oktober 2026  
**Tim Engineering**: Software Architect, Senior Full-Stack Developer, Geospatial Engineer, Application Security Engineer, QA Lead  
**Status Eksekusi**: **COMPLETED (ALL 29/29 TESTS PASSED)**  

---

## 1. Ringkasan Kondisi Awal dan Kondisi Akhir

| Parameter Evaluasi | Kondisi Awal (Sebelum Perbaikan) | Kondisi Akhir (Sesudah Peningkatan) |
|---|---|---|
| **Penyimpanan & Database** | Tabel Prisma belum termigrasi ke MySQL lokal (server mati). Halaman memakai data array hardcoded di memory client (`useState`). | Database MySQL 8.x (`becak_listrik`) aktif di port 3306, skema termigrasi, terisi seed 7 POI nyata, 4 driver, 5 unit becak listrik, dan histori transaksi riil. |
| **Alur Pemesanan (Customer)** | Form text statis tanpa peta. Tarif di-hardcode (Rp12.000 / Rp18.000). Kode order dihasilkan acak dengan `Math.random()`. | Pemesanan interaktif berbasis peta Leaflet & POI kawasan heritage. Jarak jalan & tarif dihitung di backend server. Kode order format standar `ORD-YYYYMMDD-XXX`. |
| **Peta & Geospasial** | Belum ada library peta sama sekali. Tidak ada visualisasi titik jemput, tujuan, atau armada. | Peta interaktif Leaflet + OpenStreetMap CartoDB terintegrasi. Menampilkan radius zona operasional 3.5 km, POI depot, rute polyline jalan, dan marker becak listrik dinamis. |
| **Simulasi Pergerakan Driver** | Hanya tombol klik manual yang menambah counter array lokal. Tidak ada koordinat spasial. | Mesin simulasi spasial terkalibrasi (`lib/simulation.ts` + `/api/simulation/step`) dengan interpolasi rute polyline jalan, rotasi sudut *bearing*, dan kontrol kecepatan (1x, 2x, instan). |
| **Sistem Dispatch Mitra** | Tabel antrean ada namun tidak ada logika alokasi backend. | Modul dispatch transaksional FIFO (`lib/dispatch.ts`) yang mengunci alokasi driver secara atomik dan mencegah benturan pesanan (*double-booking*). |
| **Dashboard Operasional Admin** | Mockup angka statis, penambahan driver tidak tersimpan ke DB. | Operations Center nyata terhubung ke endpoint `/api/admin/stats` & `/api/admin/drivers`, peta pemantauan armada live, kontrol skenario demo, dan ekspor data CSV. |
| **Dashboard Mitra Driver** | Dummy mockup state lokal. | Terhubung ke status online/offline database, pemantauan pesanan yang ditugaskan, dan navigasi rute ke titik penjemputan. |
| **Analisis Dampak Lingkungan** | Belum ada. | Modul Eco Analytics (`lib/eco.ts`) menghitung km bersih, kWh listrik, emisi CO₂ terhindar vs motor bensin berbasis standar ESDM & IPCC. |
| **Aksesibilitas Demo & Akun** | Terkunci redirect loop jika membuka halaman pelanggan tanpa login. | Dilengkapi tombol cepat 1-klik akun demo (Admin, Driver, Penumpang) dan pemesanan mode tamu tanpa hambatan. |

---

## 2. Struktur Modul & Dokumen yang Dibuat

Codebase kini dilengkapi dengan dokumentasi arsitektur komprehensif pada direktori `docs/`:
1. `docs/TECHNICAL_AUDIT.md`: Audit menyeluruh framework, routing, stack, dan dependensi.
2. `docs/PRODUCT_GAP_ANALYSIS.md`: Matriks kesenjangan produk terhadap standar lomba.
3. `docs/IMPLEMENTATION_PLAN.md`: Rencana eksekusi 7 fase rekayasa platform.
4. `docs/DATABASE_DESIGN.md`: Skema kamus data relasional, ERD Mermaid, indeks FIFO, dan integritas transaksi.
5. `docs/SECURITY_REVIEW.md`: Evaluasi risiko OWASP, otorisasi RBAC, proteksi XSS/SQLi, dan audit privasi.
6. `docs/FINAL_COMPETITION_REPORT.md`: Laporan akhir komprehensif ini.

---

## 3. Hasil Pengujian Otomatis End-to-End (E2E)

Pengujian otomatis dijalankan menggunakan script pengujian `scripts/verify-simulation.ts`:

```
=================================================
🚀 STARTING E2E TEST SUITE: BECAK LISTRIK PLATFORM
=================================================

--- 1. Testing Database Health & Operational Zone ---
  [PASS] Test 1: Pangkalan operasional ditemukan di database MySQL.
  [PASS] Test 2: Titik POI kawasan heritage terisi >= 5 titik.
  [PASS] Test 3: Radius zona operasional terkonfigurasi 3.5 km.

--- 2. Testing Geospatial & Haversine Distance ---
  [PASS] Test 4: Jarak garis lurus terhitung akurat (~1.36 km).

--- 3. Testing Road Routing Provider ---
  [PASS] Test 5: Rute jalan menghasilkan array waypoints koordinat.
  [PASS] Test 6: Jarak rute jalan lebih panjang atau sama dengan jarak lurus.
  [PASS] Test 7: Estimasi durasi rute becak terkalibrasi (17 menit).

--- 4. Testing Polyline Interpolation & Heading ---
  [PASS] Test 8: Interpolasi 0% berada di titik awal penjemputan.
  [PASS] Test 9: Interpolasi 100% berada di titik tujuan.
  [PASS] Test 10: Rotasi sudut heading terhitung (333°).

--- 5. Testing Customer Booking Creation & Pricing ---
  [PASS] Test 11: Akun penumpang demo tersedia.
  [PASS] Test 12: Pesanan baru berhasil dibuat dengan ID dan status 'MENCARI_DRIVER'.
  [PASS] Test 13: Tarif terhitung server-side (Bukan input dari client).

--- 6. Testing FIFO Dispatch & Transactional Lock ---
  [PASS] Test 14: Dispatch FIFO menemukan driver online tersedia.
  [PASS] Test 15: Status order berubah atomik menjadi 'DITERIMA'.
  [PASS] Test 16: Driver ID terikat pada pesanan.
  [PASS] Test 17: Status driver diperbarui menjadi 'ON_TRIP'.

--- 7. Testing Simulation Engine Lifecycle Transitions ---
  [PASS] Test 18: Simulasi memicu transisi ke 'DIJEMPUT'.
  [PASS] Test 19: Driver tiba di titik jemput, status beralih ke 'BERJALAN'.
  [PASS] Test 20: Progres perjalanan bertambah menuju tujuan.
  [PASS] Test 21: Perjalanan tiba di destinasi akhir, status menjadi 'SELESAI'.
  [PASS] Test 22: Status order di DB terkunci 'SELESAI'.
  [PASS] Test 23: Pembayaran order lunas otomatis terbuat.
  [PASS] Test 24: Driver kembali berstatus 'ONLINE' dan siap antrean baru.

--- 8. Testing Environmental Impact Calculator ---
  [PASS] Test 25: Total km teragregasi.
  [PASS] Test 26: Emisi CO2 dihindari netto terhitung (~1.72 kg).
  [PASS] Test 27: Konsumsi kWh listrik terhitung.

--- 9. Testing Edge Case: Double Booking Prevention ---
  [PASS] Test 28: Mencegah alokasi ganda pada order yang sudah diproses.

--- 10. Testing Safe Demo Scenario Reset ---
  [PASS] Test 29: Reset skenario demo berjalan tanpa merusak basis data akun.

=================================================
🎉 ALL 29/29 TESTS PASSED SUCCESSFULLY!
=================================================
```

---

## 4. Panduan Menjalankan Sistem & Skenario Demonstrasi Juri

### A. Memulai Aplikasi
1. Pastikan service MySQL berjalan di localhost port 3306.
2. Jalankan server pengembangan Next.js:
   ```bash
   npm run dev
   ```
3. Buka peramban di [http://localhost:3000](http://localhost:3000).

### B. Akun Demo Perlombaan (Password: `password123`)
- **Admin Pangkalan**: `admin@becak.test` (Akses penuh Operations Center, peta armada, dan kontrol demo)
- **Mitra Driver 1**: `budi@becak.test` (Unit BL-001)
- **Mitra Driver 2**: `agus@becak.test` (Unit BL-002)
- **Mitra Driver 3**: `joko@becak.test` (Unit BL-003)
- **Wisatawan / Pelanggan**: `rina@becak.test` atau langsung pesan sebagai Tamu.

### C. Alur Skenario Demonstrasi untuk Presentasi Juri (5 Menit)
1. **Langkah 1 (Konteks & Nilai Tambah)**: Tunjukkan halaman Beranda (`/`). Jelaskan masalah mobilitas kawasan heritage, polusi knalpot, dan pemerataan pendapatan pengemudi becak melalui sistem digital.
2. **Langkah 2 (Pemesanan Pelanggan)**: Buka halaman Pemesanan (`/pelanggan`). Pilih penjemputan *Stasiun Tugu* dan tujuan *Titik Nol KM*. Perlihatkan rute jalan polyline dan estimasi tarif server (Rp5.000 dasar + Rp3.000/km) serta estimasi CO₂ yang dihemat. Klik *Pesan Sekarang*.
3. **Langkah 3 (Mesin Simulasi Spasial)**: Begitu pesanan dibuat, sistem otomatis mengalokasikan driver pertama dari antrean FIFO pangkalan. Marker becak listrik mulai bergerak sepanjang jalan kelokan rute dengan rotasi arah yang dinamis. Juri dapat melihat peralihan status otomatis: `DITERIMA` → `DIJEMPUT` → `BERJALAN` → `SELESAI`.
4. **Langkah 4 (Dashboard Mitra Driver)**: Buka tab baru di `/driver`. Tunjukkan bahwa pesanan yang sama muncul di dashboard driver, lengkap dengan navigasi dan status pendapatan hari ini.
5. **Langkah 5 (Operations Center Admin)**: Buka tab `/admin`. Perlihatkan seluruh armada yang aktif pada peta live, grafik omzet riil dari database, distribusi status antrean, dan kartu kalkulator dampak lingkungan (total km, kWh listrik, liter bensin terhemat, dan kg CO₂ terhindar).
6. **Langkah 6 (Reset Aman)**: Tekan tombol *Reset Skenario Demo* di header admin untuk mengembalikan kondisi simulasi ke titik awal tanpa menghapus data pangkalan maupun akun.
