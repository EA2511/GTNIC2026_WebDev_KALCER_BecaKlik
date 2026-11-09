# SECURITY REVIEW — BECAKLIK MAJALENGKA MOBILITY PLATFORM

**Klasifikasi Dokumen**: Security & Privacy Architecture Review  
**Tanggal**: 28 Oktober 2026  
**Auditor**: Application Security Engineering Lead  

---

## 1. Lingkup Pengujian & Arsitektur Keamanan

Sistem Becak Listrik dievaluasi berdasarkan standar OWASP Top 10 Web Application Security Risks dan prinsip keamanan Least Privilege.

| Aspek Keamanan | Implementasi & Proteksi Aktual | Status |
|---|---|---|
| **Penyimpanan Password** | Algoritma `bcryptjs` dengan salt rounds 10. Tidak ada penyimpanan plaintext. | **PASS** |
| **Manajemen Sesi** | Cookie `httpOnly`, `sameSite: "lax"`, dengan signature HMAC-SHA256 (`lib/auth.ts`) dan verifikasi `crypto.timingSafeEqual` untuk mencegah serangan timing attack. | **PASS** |
| **Injeksi SQL (SQLi)** | Menggunakan Prisma ORM parameterized queries untuk seluruh pembacaan dan penulisan data. Tidak menggunakan query string concatenation mentah. | **PASS** |
| **Cross-Site Scripting (XSS)** | React JSX auto-escaping pada seluruh render UI teks dan properti. | **PASS** |
| **Validasi Sisi Server (Server-Side)** | Seluruh perhitungan jarak, tarif, dan transisi status order divalidasi dan dihitung di backend, bukan mengandalkan input manipulatif dari client. | **PASS** |
| **Otorisasi Berbasis Peran (RBAC)** | Layout guard dan middleware API memeriksa peran pengguna (`ADMIN`, `DRIVER`, `PENUMPANG`). Driver hanya dapat memperbarui pesanan miliknya sendiri. | **PASS** |
| **Privasi Pengemudi & Penumpang** | Nomor HP dan identitas pribadi dibatasi pada payload API; koordinat live hanya dipancarkan selama siklus pesanan aktif. | **PASS** |

---

## 2. Transisi Status Terkendali (State Transition Integrity)

Untuk mencegah race condition dan bypass alur pemesanan:
- Transisi `MENCARI_DRIVER` → `DITERIMA` hanya dapat dilakukan oleh modul dispatch atau driver yang dituju.
- Transisi `DITERIMA` → `DIJEMPUT` → `BERJALAN` → `SELESAI` wajib dilakukan secara sekuensial. Driver tidak dapat melompat dari `DITERIMA` langsung ke `SELESAI`.
- Transisi pembatalan (`DIBATALKAN`) hanya diizinkan sebelum driver memulai perjalanan (`BERJALAN`).

---

## 3. Penanganan Data Simulasi & Batasan Lingkungan (Residual Risk)

1. **Simulasi Telemetri**: Koordinat posisi driver dihasilkan oleh routing interpolator berbasis polyline jalan OpenStreetMap / OSRM. Sistem secara transparan memberi label *"Simulasi"* agar tidak disalahartikan sebagai perangkat GPS IoT fisik.
2. **Koneksi Database Lokal**: Kredensial MySQL disimpan di `.env` lokal (`mysql://root:@localhost:3306/becak_listrik`). Untuk deployment publik di server produksi, environment variable wajib diganti dengan password kuat dan koneksi SSL/TLS.
3. **Konfigurasi Secret**: `SESSION_SECRET` wajib memiliki panjang minimal 32 karakter acak dengan entropi tinggi.
