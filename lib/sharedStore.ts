// Shared Real-Time Store (Persistensi Lintas Request + Disk Cache untuk sinkronisasi Pelanggan <-> Driver <-> Admin)

import fs from 'fs';
import path from 'path';
import {
  interpolateRoutePosition,
  generateRoadCorridorFallback,
  generatePickupApproachRoute,
  type LatLng,
} from './geo';
import { calculateEcoImpact } from './eco';
import {
  SNAPSHOT_ORDERS,
  SNAPSHOT_RATINGS,
  SNAPSHOT_REGISTERED_USERS,
  SNAPSHOT_FLEET_DRIVERS,
  SNAPSHOT_DRIVER_STATS,
} from './defaultStoreSnapshot';

export interface SharedOrder {
  id: number;
  kode: string;
  status: 'MENCARI_DRIVER' | 'DITERIMA' | 'DIJEMPUT' | 'BERJALAN' | 'SELESAI' | 'DIBATALKAN';
  jemputAlamat: string;
  jemputLat: number;
  jemputLng: number;
  tujuanAlamat: string;
  tujuanLat: number;
  tujuanLng: number;
  penumpangNama: string;
  penumpangEmail: string;
  penumpangNoHp: string;
  jarakKm: number;
  durasiMenit: number;
  tarif: number;
  diskon: number;
  totalBayar: number;
  tip?: number;
  promoKode?: string;
  serviceType?: 'REGULER' | 'KARGO' | 'WISATA';
  passengerCount?: number;
  catatan?: string;
  metodePembayaran?: 'QRIS' | 'CASH' | 'TUNAI' | 'SALDO';
  simulationProgress: number;
  routeGeometry: string;
  driverId: number | null;
  lastStepAt?: number;
  dismissedByDriver?: boolean;
  dismissedByPassenger?: boolean;
  countedInStats?: boolean;
  countedTip?: number;
  driver?: {
    id: number;
    currentLat: number;
    currentLng: number;
    heading: number;
    ratingAverage: number;
    totalTrips: number;
    user: { id: number; nama: string; noHp: string };
    vehicle: {
      kodeUnit: string;
      modelName: string;
      warna: string;
      kapasitas: number;
      batteryPct: number;
    };
  } | null;
  vehicle?: {
    kodeUnit: string;
    modelName: string;
    warna: string;
    kapasitas: number;
    batteryPct: number;
  } | null;
  createdAt: string;
}

export interface SharedRating {
  id: number;
  orderId: number;
  penumpangNama: string;
  driverNama: string;
  unit: string;
  skor: number;
  kategori: string;
  komentar: string;
  tip?: number;
  rute?: string;
  createdAt: string;
  timestamp: number;
}

export interface SharedChatMessage {
  id: number;
  orderId: number;
  senderRole: 'PENUMPANG' | 'DRIVER' | 'ADMIN';
  senderId?: number;
  senderNama: string;
  pesan: string;
  createdAt: string;
}

export interface SharedRegisteredUser {
  id: number;
  nama: string;
  email: string;
  noHp: string;
  password: string;
  role: 'PENUMPANG' | 'DRIVER' | 'ADMIN';
  createdAt: string;
}

export interface SharedFleetDriver {
  rawId: number;
  id: string;
  nama: string;
  email: string;
  noHp: string;
  unit: string;
  status: 'ONLINE' | 'ON_TRIP' | 'OFFLINE';
  battery: number;
  trips: number;
  completedToday: number;
  income: number;
  tipsReceived: number;
  rating: number;
  onTimeRate: number;
  ecoScore: number;
  koridor: string;
  lat: number;
  lng: number;
  heading: number;
}

export interface RankedFleetDriver extends SharedFleetDriver {
  rank: number;
  performanceScore: number;
  badge: string;
  statusLabel: 'Online' | 'Dalam perjalanan' | 'Offline';
}

export interface PassengerHistorySyncItem {
  id: number;
  kode: string;
  tanggal: string;
  timestamp?: number;
  jemputAlamat: string;
  tujuanAlamat: string;
  jarakKm: number;
  durasiMenit: number;
  tarif: number;
  diskon: number;
  tip: number;
  totalBayar: number;
  metode: string;
  driverNama: string;
  driverUnit: string;
  ratingScore: number;
  ratingCategory: string;
  ratingComment: string;
  penumpangNama?: string;
  penumpangEmail?: string;
}

const BASE_RATING_TIME = Date.UTC(2026, 10, 7, 17, 0, 0);

export const INITIAL_REGISTERED_USERS: SharedRegisteredUser[] = [
  {
    id: 101,
    nama: 'Edrick Andreas',
    email: 'edrick@gmail.com',
    noHp: '081298765432',
    password: 'password123',
    role: 'PENUMPANG',
    createdAt: new Date(BASE_RATING_TIME).toISOString(),
  },
  {
    id: 102,
    nama: 'Edrick Andreas',
    email: 'edrick@becak.test',
    noHp: '081298765432',
    password: 'password123',
    role: 'PENUMPANG',
    createdAt: new Date(BASE_RATING_TIME).toISOString(),
  },
];

const INITIAL_RATINGS: SharedRating[] = [
  {
    id: 1001,
    orderId: 1001,
    penumpangNama: 'Edrick Andreas',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Rute Cepat & Aman',
    komentar: 'makasihh pakkkkkk',
    tip: 20000,
    rute: 'Universitas Majalengka (Kampus UNMA) ➔ RSUD Cideres Majalengka',
    createdAt: 'Kemarin, 16:37',
    timestamp: Date.UTC(2026, 10, 7, 9, 37, 0),
  },
  {
    id: 991,
    orderId: 991,
    penumpangNama: 'Rina Kusuma',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Tepat Waktu & Hening',
    komentar: 'Becaknya bersih dan tidak bising. Sangat nyaman untuk keliling kota!',
    tip: 2000,
    rute: 'Alun-Alun Majalengka ➔ Pasar Mambo Sentra Kuliner',
    createdAt: '5 hari lalu, 14:20',
    timestamp: Date.UTC(2026, 10, 3, 7, 20, 0),
  },
  {
    id: 990,
    orderId: 990,
    penumpangNama: 'Rina Kusuma',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Driver Ramah',
    komentar: 'Pak Budi ramah sekali, menjelaskan sejarah Majalengka di jalan.',
    tip: 5000,
    rute: 'Bunderan Munjul ➔ Gedung Juang Majalengka',
    createdAt: '6 hari lalu, 09:45',
    timestamp: Date.UTC(2026, 10, 2, 2, 45, 0),
  },
  {
    id: 989,
    orderId: 989,
    penumpangNama: 'Ahmad Fauzi',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Tepat Waktu & Hening',
    komentar: 'Becak listriknya sangat nyaman dan bersih, tidak bising sama sekali saat menuju kampus!',
    tip: 3000,
    rute: 'Jl. Siti Armilah ➔ Universitas Majalengka (UNMA)',
    createdAt: '1 Nov 2026, 15:35',
    timestamp: Date.UTC(2026, 10, 1, 8, 35, 0),
  },
  {
    id: 988,
    orderId: 988,
    penumpangNama: 'Hj. Siti Rahmawati',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Driver Ramah & Sabar',
    komentar: 'Pak Budi sangat membantu membawakan belanjaan pasar saya sampai depan teras rumah.',
    tip: 5000,
    rute: 'Pasar Sindangkasih Cigasong ➔ Perum Wijaya Kusuma Cijati',
    createdAt: '31 Okt 2026, 10:00',
    timestamp: Date.UTC(2026, 9, 31, 3, 0, 0),
  },
  {
    id: 987,
    orderId: 987,
    penumpangNama: 'Dr. Hendra Pratama',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Kabin Bersih & Nyaman',
    komentar: 'Suspensi empuk dan bebas asap knalpot, sangat cocok untuk pasien lansia ke RSUD.',
    tip: 5000,
    rute: 'Pemukiman Babakan Jawa ➔ RSUD Majalengka',
    createdAt: '30 Okt 2026, 11:15',
    timestamp: Date.UTC(2026, 9, 30, 4, 15, 0),
  },
  {
    id: 986,
    orderId: 986,
    penumpangNama: 'Neng Dinda Permata',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Tarif Jujur & Transparan',
    komentar: 'Bayar pakai QRIS praktis banget, tarifnya pas sesuai aplikasi tanpa tawar-menawar.',
    tip: 2000,
    rute: 'SMAN 1 Majalengka ➔ Surya Toserba Majalengka',
    createdAt: '29 Okt 2026, 13:30',
    timestamp: Date.UTC(2026, 9, 29, 6, 30, 0),
  },
  {
    id: 985,
    orderId: 985,
    penumpangNama: 'Kang Asep Sunandar',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Tepat Waktu & Hening',
    komentar: 'Jemputan di Taman Dirgantara sangat cepat, kanopi becaknya adem meski siang hari.',
    tip: 0,
    rute: 'Taman Dirgantara Munjul ➔ Alun-Alun Majalengka',
    createdAt: '28 Okt 2026, 14:00',
    timestamp: Date.UTC(2026, 9, 28, 7, 0, 0),
  },
  {
    id: 984,
    orderId: 984,
    penumpangNama: 'Ibu Dewi Sartika',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Driver Ramah',
    komentar: 'Anak-anak senang sekali naik becak listrik biru langit ini keliling Bunderan Munjul.',
    tip: 5000,
    rute: 'Alun-Alun Majalengka ➔ Bunderan Munjul & Tugu Bola Dunia',
    createdAt: '27 Okt 2026, 15:00',
    timestamp: Date.UTC(2026, 9, 27, 8, 0, 0),
  },
  {
    id: 983,
    orderId: 983,
    penumpangNama: 'Rizky Maulana',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 5,
    kategori: 'Tepat Waktu & Hening',
    komentar: 'Solusi transportasi jarak dekat terbaik di Majalengka, bebas polusi dan modern.',
    tip: 2000,
    rute: 'GGM Majalengka ➔ Kopi Apik Jl. Satari',
    createdAt: '26 Okt 2026, 16:40',
    timestamp: Date.UTC(2026, 9, 26, 9, 40, 0),
  },
  {
    id: 982,
    orderId: 982,
    penumpangNama: 'Bapak H. Tatang Koswara',
    driverNama: 'Budi Santoso',
    unit: 'BL-001',
    skor: 4,
    kategori: 'Berkendara Aman',
    komentar: 'Laju becak stabil dan sopan di jalan raya KH Abdul Halim. Mantap BecaKlik!',
    tip: 2000,
    rute: 'Pendopo Majalengka ➔ Perum Puri Asih',
    createdAt: '25 Okt 2026, 14:15',
    timestamp: Date.UTC(2026, 9, 25, 7, 15, 0),
  },
  {
    id: 981,
    orderId: 981,
    penumpangNama: 'Larasati Putri',
    driverNama: 'Agus Prayitno',
    unit: 'BL-002',
    skor: 5,
    kategori: 'Driver Ramah',
    komentar: 'Pak Agus sigap dan tepat waktu saat menjemput di depan gerbang Kampus UNMA.',
    tip: 2000,
    rute: 'Kampus UNMA ➔ Yogya Grand Majalengka',
    createdAt: '24 Okt 2026, 10:20',
    timestamp: Date.UTC(2026, 9, 24, 3, 20, 0),
  },
  {
    id: 980,
    orderId: 980,
    penumpangNama: 'Dadan Ramdani',
    driverNama: 'Joko Riyadi',
    unit: 'BL-003',
    skor: 5,
    kategori: 'Kabin Bersih & Nyaman',
    komentar: 'Kabin luas muat belanjaan banyak dari Pasar Cigasong, bebas bau asap.',
    tip: 3000,
    rute: 'Pasar Sindangkasih Cigasong ➔ Perum BCA Cigasong',
    createdAt: '23 Okt 2026, 17:00',
    timestamp: Date.UTC(2026, 9, 23, 10, 0, 0),
  },
];

/**
 * Format timestamp ulasan menjadi format relatif & tanggal dinamis secara real-time.
 * Waktu dihitung berdasarkan zona waktu Indonesia (WIB UTC+7).
 */
export function formatDynamicReviewTime(timestamp: number, now: number = Date.now()): string {
  const ts = Number(timestamp);
  if (!ts || isNaN(ts) || ts <= 0) return 'Baru saja';

  const diffMs = Math.max(0, now - ts);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;

  // WIB (UTC+7) Date formatting
  const WIB_OFFSET = 7 * 3600 * 1000;
  const reviewWib = new Date(ts + WIB_OFFSET);
  const nowWib = new Date(now + WIB_OFFSET);

  const rYear = reviewWib.getUTCFullYear();
  const rMonth = reviewWib.getUTCMonth();
  const rDate = reviewWib.getUTCDate();
  const rHours = String(reviewWib.getUTCHours()).padStart(2, '0');
  const rMinutes = String(reviewWib.getUTCMinutes()).padStart(2, '0');
  const timeStr = `${rHours}:${rMinutes}`;

  const nYear = nowWib.getUTCFullYear();
  const nMonth = nowWib.getUTCMonth();
  const nDate = nowWib.getUTCDate();

  const rDayTimestamp = Date.UTC(rYear, rMonth, rDate);
  const nDayTimestamp = Date.UTC(nYear, nMonth, nDate);
  const calendarDaysDiff = Math.round((nDayTimestamp - rDayTimestamp) / (24 * 3600 * 1000));

  if (calendarDaysDiff === 0) {
    if (diffHour < 4) return `${diffHour} jam lalu`;
    return `Hari ini, ${timeStr}`;
  }
  if (calendarDaysDiff === 1) {
    return `Kemarin, ${timeStr}`;
  }
  if (calendarDaysDiff >= 2 && calendarDaysDiff <= 6) {
    return `${calendarDaysDiff} hari lalu, ${timeStr}`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${rDate} ${months[rMonth]} ${rYear}, ${timeStr}`;
}

/**
 * Parsing teks createdAt lama menjadi timestamp numerik akurat.
 */
export function parseRatingTimestamp(r: Partial<SharedRating>, now: number = Date.now()): number {
  if (typeof r.timestamp === 'number' && r.timestamp > 1700000000000) {
    return r.timestamp;
  }
  if (r.orderId === 1001) {
    return Date.UTC(2026, 10, 7, 9, 37, 0); // 7 Nov 2026, 16:37 WIB
  }

  const raw = (r.createdAt || '').trim();
  const lower = raw.toLowerCase();

  if (!raw || lower.includes('baru saja')) {
    return now;
  }

  const minMatch = lower.match(/(\d+)\s*menit/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    return now - mins * 60_000;
  }

  const hourMatch = lower.match(/(\d+)\s*jam/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    return now - hours * 3_600_000;
  }

  const WIB_OFFSET = 7 * 3600 * 1000;
  const nowWib = new Date(now + WIB_OFFSET);

  if (lower.includes('hari ini')) {
    const timeMatch = lower.match(/(\d{1,2})[:.](\d{2})/);
    const hh = timeMatch ? parseInt(timeMatch[1], 10) : 12;
    const mm = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    return Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate(), hh - 7, mm, 0);
  }

  if (lower.includes('kemarin')) {
    const timeMatch = lower.match(/(\d{1,2})[:.](\d{2})/);
    const hh = timeMatch ? parseInt(timeMatch[1], 10) : 12;
    const mm = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    return Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate() - 1, hh - 7, mm, 0);
  }

  const dayAgoMatch = lower.match(/(\d+)\s*hari\s*lalu(?:[,.\s]+(\d{1,2})[:.](\d{2}))?/);
  if (dayAgoMatch) {
    const days = parseInt(dayAgoMatch[1], 10);
    const hh = dayAgoMatch[2] ? parseInt(dayAgoMatch[2], 10) : 12;
    const mm = dayAgoMatch[3] ? parseInt(dayAgoMatch[3], 10) : 0;
    return Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate() - days, hh - 7, mm, 0);
  }

  const dateMatch = lower.match(
    /(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})(?:[,.\s]+(\d{1,2})[:.](\d{2}))?/
  );
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthIdxMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
    };
    const month = monthIdxMap[dateMatch[2].toLowerCase()] ?? 10;
    const year = parseInt(dateMatch[3], 10);
    const hh = dateMatch[4] ? parseInt(dateMatch[4], 10) : 12;
    const mm = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
    return Date.UTC(year, month, day, hh - 7, mm, 0);
  }

  return now - 72 * 3_600_000 + (r.orderId || 0);
}

function getLinkedOrderTimestamp(orderId: number): number | null {
  const globalStore = (globalThis as unknown as { __shared_store__?: StoreData }).__shared_store__;
  if (!globalStore?.orders) return null;
  const order = globalStore.orders.get(orderId);
  if (!order?.createdAt) return null;
  const t = new Date(order.createdAt).getTime();
  return isNaN(t) || t <= 1700000000000 ? null : t;
}

function isCorruptedBaseTimestamp(ts: number): boolean {
  // Timestamp antara 1794070800000 dan 1794070860000 adalah artefak lama dari BASE_RATING_TIME (00:00 WIB)
  return ts >= 1794070800000 && ts <= 1794070860000;
}

function parseAndFormatRatingTime(r: SharedRating, now: number = Date.now()): { createdAt: string; timestamp: number } {
  const orderTs = getLinkedOrderTimestamp(r.orderId);
  let ts = orderTs || parseRatingTimestamp(r, now);
  if (r.orderId === 1001) {
    ts = Date.UTC(2026, 10, 7, 9, 37, 0);
  }
  return {
    createdAt: formatDynamicReviewTime(ts, now),
    timestamp: ts,
  };
}

function sortRatingsNewestFirst(list: SharedRating[]): SharedRating[] {
  const seedMap = new Map<number, SharedRating>();
  for (const sr of INITIAL_RATINGS) {
    seedMap.set(sr.orderId, sr);
  }
  const deduped = new Map<number, SharedRating>();
  const now = Date.now();

  for (const r of list) {
    if (!r || typeof r.orderId !== 'number') continue;
    const seed = seedMap.get(r.orderId);
    const orderTs = getLinkedOrderTimestamp(r.orderId);

    let ts =
      orderTs ||
      (typeof r.timestamp === 'number' && r.timestamp > 1700000000000 && !isCorruptedBaseTimestamp(r.timestamp)
        ? r.timestamp
        : seed?.timestamp || parseRatingTimestamp(r, now));

    // Order 1001 (Edrick Andreas) selalu 7 Nov 2026, 16:37 WIB jika bukan rating baru dengan timestamp valid
    if (r.orderId === 1001) {
      ts = Date.UTC(2026, 10, 7, 9, 37, 0);
    }

    const dynamicCreatedAt = formatDynamicReviewTime(ts, now);
    const normalized: SharedRating = {
      ...r,
      createdAt: dynamicCreatedAt,
      timestamp: ts,
    };
    if (!deduped.has(normalized.orderId)) {
      deduped.set(normalized.orderId, normalized);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    return b.orderId - a.orderId;
  });
}

const INITIAL_FLEET_DRIVERS: SharedFleetDriver[] = [
  {
    rawId: 1,
    id: 'DRV-001',
    nama: 'Budi Santoso',
    email: 'budi@becak.test',
    noHp: '081234560001',
    unit: 'BL-001',
    status: 'ONLINE',
    battery: 94,
    trips: 48,
    completedToday: 6,
    income: 448000,
    tipsReceived: 31000,
    rating: 4.95,
    onTimeRate: 99,
    ecoScore: 99,
    koridor: 'Alun-Alun · KH Abdul Halim · Pasar Mambo',
    lat: -6.8355,
    lng: 108.2275,
    heading: 180,
  },
  {
    rawId: 2,
    id: 'DRV-002',
    nama: 'Agus Prayitno',
    email: 'agus@becak.test',
    noHp: '081234560002',
    unit: 'BL-002',
    status: 'ONLINE',
    battery: 88,
    trips: 44,
    completedToday: 5,
    income: 412000,
    tipsReceived: 22000,
    rating: 4.92,
    onTimeRate: 98,
    ecoScore: 97,
    koridor: 'Bunderan Munjul · Kampus UNMA · Taman Dirgantara',
    lat: -6.8295,
    lng: 108.2198,
    heading: 90,
  },
  {
    rawId: 3,
    id: 'DRV-003',
    nama: 'Joko Riyadi',
    email: 'joko@becak.test',
    noHp: '081234560003',
    unit: 'BL-003',
    status: 'ONLINE',
    battery: 82,
    trips: 39,
    completedToday: 5,
    income: 368000,
    tipsReceived: 18000,
    rating: 4.9,
    onTimeRate: 97,
    ecoScore: 96,
    koridor: 'Pasar Sindangkasih · Cigasong · Perum BCA',
    lat: -6.837,
    lng: 108.229,
    heading: 270,
  },
  {
    rawId: 4,
    id: 'DRV-004',
    nama: 'Wawan Hermawan',
    email: 'wawan@becak.test',
    noHp: '081234560004',
    unit: 'BL-004',
    status: 'ONLINE',
    battery: 86,
    trips: 35,
    completedToday: 4,
    income: 334000,
    tipsReceived: 14000,
    rating: 4.88,
    onTimeRate: 96,
    ecoScore: 95,
    koridor: 'RSUD Majalengka · Pasar Balong · Babakan Jawa',
    lat: -6.8388,
    lng: 108.224,
    heading: 45,
  },
  {
    rawId: 5,
    id: 'DRV-005',
    nama: 'Dedi Kusnadi',
    email: 'dedi@becak.test',
    noHp: '081234560005',
    unit: 'BL-005',
    status: 'ONLINE',
    battery: 91,
    trips: 31,
    completedToday: 4,
    income: 295000,
    tipsReceived: 11000,
    rating: 4.87,
    onTimeRate: 95,
    ecoScore: 95,
    koridor: 'Yogya Grand · Surya Toserba · Stadion Warung Jambu',
    lat: -6.8348,
    lng: 108.231,
    heading: 120,
  },
  {
    rawId: 6,
    id: 'DRV-006',
    nama: 'Hendra Gunawan',
    email: 'hendra@becak.test',
    noHp: '081234560006',
    unit: 'BL-006',
    status: 'OFFLINE',
    battery: 76,
    trips: 26,
    completedToday: 3,
    income: 248000,
    tipsReceived: 8000,
    rating: 4.84,
    onTimeRate: 94,
    ecoScore: 93,
    koridor: 'Perum Wijaya Kusuma · Cijati · Cicurug',
    lat: -6.8465,
    lng: 108.2345,
    heading: 0,
  },
];

interface StoreData {
  orders: Map<number, SharedOrder>;
  ratings: SharedRating[];
  chatMessages: Map<number, SharedChatMessage[]>;
  registeredUsers: Map<string, SharedRegisteredUser>;
  fleetDrivers: SharedFleetDriver[];
  syncedHistoryIds: Set<number>;
  driverStatus: 'ONLINE' | 'OFFLINE' | 'ON_TRIP';
  driverRating: number;
  driverTotalTrips: number;
  driverCompletedToday: number;
  driverEarningsToday: number;
  nextOrderId: number;
  nextUserId: number;
  nextChatId: number;
}

const CACHE_FILE_PATH =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.TMPDIR
    ? path.join('/tmp', '.becak-store-cache.json')
    : path.join(process.cwd(), '.becak-store-cache.json');

function loadPersistedCache(): Partial<{
  version: number;
  orders: [number, SharedOrder][];
  chatMessages: [number, SharedChatMessage[]][];
  ratings: SharedRating[];
  registeredUsers: [string, SharedRegisteredUser][];
  fleetDrivers: SharedFleetDriver[];
  syncedHistoryIds: number[];
  driverStatus: 'ONLINE' | 'OFFLINE' | 'ON_TRIP';
  driverRating: number;
  driverTotalTrips: number;
  driverCompletedToday: number;
  driverEarningsToday: number;
  nextOrderId: number;
}> | null {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore read error
  }
  return null;
}

function savePersistedCache(s: StoreData): void {
  try {
    const payload = {
      version: 5,
      orders: Array.from(s.orders.entries()),
      chatMessages: Array.from(s.chatMessages.entries()),
      ratings: sortRatingsNewestFirst(s.ratings),
      registeredUsers: Array.from(s.registeredUsers.entries()),
      fleetDrivers: s.fleetDrivers,
      syncedHistoryIds: Array.from(s.syncedHistoryIds),
      driverStatus: s.driverStatus,
      driverRating: s.driverRating,
      driverTotalTrips: s.driverTotalTrips,
      driverCompletedToday: s.driverCompletedToday,
      driverEarningsToday: s.driverEarningsToday,
      nextOrderId: s.nextOrderId,
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(payload), 'utf-8');
  } catch {
    // ignore write error in read-only environments
  }
}

function normalizeAndSortRatings(rawRatings: SharedRating[]): SharedRating[] {
  const now = Date.now();
  const customRatings = (rawRatings || [])
    .filter((r) => r && r.orderId >= 1000)
    .map((r) => {
      let ts =
        typeof r.timestamp === 'number' && r.timestamp > 1700000000000
          ? r.timestamp
          : parseRatingTimestamp(r, now);
      if (r.orderId === 1001 && (!r.timestamp || r.timestamp > now + 60_000)) {
        ts = Date.UTC(2026, 10, 7, 9, 37, 0);
      }
      return {
        ...r,
        timestamp: ts,
        createdAt: formatDynamicReviewTime(ts, now),
      };
    });

  const existingOrderIds = new Set(customRatings.map((r) => r.orderId));
  const merged = [...customRatings];
  for (const seedRating of INITIAL_RATINGS) {
    if (!existingOrderIds.has(seedRating.orderId)) {
      merged.push({ ...seedRating });
    }
  }
  return sortRatingsNewestFirst(merged);
}

const globalForStore = globalThis as unknown as { __shared_store__?: StoreData };

if (!globalForStore.__shared_store__) {
  const cached = loadPersistedCache();
  const rawRatings = cached?.ratings && cached.ratings.length > 0 ? cached.ratings : SNAPSHOT_RATINGS;
  const mergedRatings = normalizeAndSortRatings(rawRatings);
  
  const userEntries =
    cached?.registeredUsers && cached.registeredUsers.length > 0
      ? cached.registeredUsers
      : SNAPSHOT_REGISTERED_USERS;
  const initialRegUsersMap = new Map<string, SharedRegisteredUser>(userEntries);
  for (const u of INITIAL_REGISTERED_USERS) {
    if (!initialRegUsersMap.has(u.email)) {
      initialRegUsersMap.set(u.email, u);
    }
  }

  const initialOrdersEntries =
    cached?.orders && cached.orders.length > 0 ? cached.orders : SNAPSHOT_ORDERS;

  globalForStore.__shared_store__ = {
    orders: new Map<number, SharedOrder>(initialOrdersEntries),
    chatMessages: new Map<number, SharedChatMessage[]>(cached?.chatMessages || []),
    registeredUsers: initialRegUsersMap,
    ratings: mergedRatings,
    fleetDrivers:
      cached?.fleetDrivers && cached.fleetDrivers.length >= 5
        ? cached.fleetDrivers
        : (SNAPSHOT_FLEET_DRIVERS.length >= 5 ? SNAPSHOT_FLEET_DRIVERS : INITIAL_FLEET_DRIVERS).map((d) => ({ ...d })),
    syncedHistoryIds: new Set<number>(
      cached?.syncedHistoryIds || SNAPSHOT_DRIVER_STATS.syncedHistoryIds || [990, 991, 1000, 1001]
    ),
    driverStatus: cached?.driverStatus || SNAPSHOT_DRIVER_STATS.driverStatus || 'ONLINE',
    driverRating: cached?.driverRating ?? SNAPSHOT_DRIVER_STATS.driverRating ?? 4.95,
    driverTotalTrips: cached?.driverTotalTrips ?? SNAPSHOT_DRIVER_STATS.driverTotalTrips ?? 63,
    driverCompletedToday: cached?.driverCompletedToday ?? SNAPSHOT_DRIVER_STATS.driverCompletedToday ?? 21,
    driverEarningsToday: cached?.driverEarningsToday ?? SNAPSHOT_DRIVER_STATS.driverEarningsToday ?? 425738,
    nextOrderId: cached?.nextOrderId ?? SNAPSHOT_DRIVER_STATS.nextOrderId ?? 1016,
    nextUserId: 110,
    nextChatId: 500,
  };
}

const store = globalForStore.__shared_store__;
if (!store.registeredUsers) {
  store.registeredUsers = new Map<string, SharedRegisteredUser>();
}
for (const u of INITIAL_REGISTERED_USERS) {
  if (!store.registeredUsers.has(u.email)) {
    store.registeredUsers.set(u.email, u);
  }
}
if (!store.orders.has(1001)) {
  store.orders.set(1001, {
    id: 1001,
    kode: 'ORD-20261107-613',
    status: 'SELESAI',
    jemputAlamat: 'Universitas Majalengka (Kampus UNMA)',
    jemputLat: -6.8295,
    jemputLng: 108.2198,
    tujuanAlamat: 'RSUD Cideres Majalengka',
    tujuanLat: -6.782,
    tujuanLng: 108.214,
    penumpangNama: 'Edrick Andreas',
    penumpangEmail: 'edrick@gmail.com',
    penumpangNoHp: '081298765432',
    jarakKm: 8.8,
    durasiMenit: 28,
    tarif: 33490,
    diskon: 3000,
    totalBayar: 50490,
    tip: 20000,
    simulationProgress: 100,
    routeGeometry: '[]',
    driverId: 1,
    dismissedByDriver: true,
    dismissedByPassenger: true,
    countedInStats: true,
    countedTip: 20000,
    createdAt: new Date(BASE_RATING_TIME + 60_000).toISOString(),
  });
}
if (!store.chatMessages) {
  store.chatMessages = new Map<number, SharedChatMessage[]>();
}
if (!store.fleetDrivers || store.fleetDrivers.length === 0) {
  store.fleetDrivers = INITIAL_FLEET_DRIVERS.map((d) => ({ ...d }));
}
if (!store.syncedHistoryIds) {
  store.syncedHistoryIds = new Set<number>([990, 991, 1001]);
}
store.syncedHistoryIds.add(1001);
store.ratings = normalizeAndSortRatings(store.ratings);
const maxExistingOrderId = Math.max(
  1000,
  ...Array.from(store.orders.keys()),
  ...store.ratings.map((r) => r.orderId)
);
if (!store.nextOrderId || store.nextOrderId <= maxExistingOrderId) {
  store.nextOrderId = maxExistingOrderId + 1;
}
savePersistedCache(store);
if (!store.nextUserId) {
  store.nextUserId = 10;
}
if (!store.nextChatId) {
  store.nextChatId = 500;
}
if (typeof store.driverCompletedToday !== 'number') {
  store.driverCompletedToday = 6;
}
if (typeof store.driverEarningsToday !== 'number') {
  store.driverEarningsToday = 78000;
}

function syncDriverOneToFleet() {
  const drv1 = store.fleetDrivers.find((d) => d.rawId === 1);
  if (!drv1) return;
  const activeOrder = sharedStore.getActiveOrder(1);
  const isCurrentlyOnTrip = Boolean(
    activeOrder &&
    activeOrder.status !== 'SELESAI' &&
    activeOrder.status !== 'DIBATALKAN' &&
    ['DITERIMA', 'DIJEMPUT', 'BERJALAN'].includes(activeOrder.status)
  );

  drv1.status = isCurrentlyOnTrip ? 'ON_TRIP' : 'ONLINE';
  if (!isCurrentlyOnTrip) {
    store.driverStatus = 'ONLINE';
  }
  drv1.trips = store.driverTotalTrips;
  drv1.completedToday = store.driverCompletedToday;
  drv1.rating = store.driverRating;
  const extraEarnings = Math.max(0, store.driverEarningsToday - 78000);
  drv1.income = 448000 + extraEarnings;
  const driver1Tips = store.ratings
    .filter((r) => r.unit === 'BL-001' || r.driverNama.includes('Budi'))
    .reduce((acc, r) => acc + (r.tip || 0), 0);
  drv1.tipsReceived = Math.max(31000, driver1Tips);

  if (isCurrentlyOnTrip && activeOrder?.driver) {
    drv1.lat = activeOrder.driver.currentLat;
    drv1.lng = activeOrder.driver.currentLng;
    drv1.heading = activeOrder.driver.heading;
  } else {
    // Kembali standby di pangkalan (Alun-Alun Majalengka)
    drv1.lat = -6.8355;
    drv1.lng = 108.2275;
    drv1.heading = 180;
  }
}

function ensureRouteCoords(order: SharedOrder): LatLng[] {
  if (order.routeGeometry) {
    try {
      const parsed = JSON.parse(order.routeGeometry);
      if (Array.isArray(parsed) && parsed.length > 1) {
        return parsed as LatLng[];
      }
    } catch {
      // regenerate below
    }
  }
  const fallback = generateRoadCorridorFallback(
    order.jemputLat,
    order.jemputLng,
    order.tujuanLat,
    order.tujuanLng
  );
  order.routeGeometry = JSON.stringify(fallback);
  return fallback;
}

export const sharedStore = {
  // Buat Order Baru (Status MENCARI_DRIVER)
  createOrder(data: Omit<SharedOrder, 'id' | 'driverId' | 'driver' | 'createdAt'> & { id?: number }): SharedOrder {
    const id = data.id && Number.isInteger(data.id) ? data.id : store.nextOrderId++;
    for (const old of store.orders.values()) {
      if (old.status === 'SELESAI' || old.status === 'DIBATALKAN') {
        old.dismissedByDriver = true;
        old.dismissedByPassenger = true;
      }
    }
    let routeGeom = data.routeGeometry;
    if (!routeGeom || routeGeom === '[]') {
      const coords = generateRoadCorridorFallback(
        data.jemputLat,
        data.jemputLng,
        data.tujuanLat,
        data.tujuanLng
      );
      routeGeom = JSON.stringify(coords);
    }
    const order: SharedOrder = {
      ...data,
      id,
      routeGeometry: routeGeom,
      driverId: null,
      driver: null,
      createdAt: new Date().toISOString(),
    };
    store.orders.set(id, order);
    syncDriverOneToFleet();
    savePersistedCache(store);
    return order;
  },

  getOrder(id: number | string): SharedOrder | null {
    const numId = Number(id);
    if (!isNaN(numId) && store.orders.has(numId)) {
      const o = store.orders.get(numId)!;
      ensureRouteCoords(o);
      return o;
    }
    for (const o of store.orders.values()) {
      if (o.id === numId || String(o.id) === String(id) || o.kode === String(id)) {
        ensureRouteCoords(o);
        return o;
      }
    }
    return null;
  },

  getAllOrders(): SharedOrder[] {
    return Array.from(store.orders.values()).sort((a, b) => b.id - a.id);
  },

  // Mendapatkan order yang sedang mencari driver untuk notifikasi pop-up Mitra Driver
  getIncomingOrders(): SharedOrder[] {
    const incoming: SharedOrder[] = [];
    for (const order of store.orders.values()) {
      if (order.status === 'MENCARI_DRIVER' && !order.dismissedByDriver) {
        ensureRouteCoords(order);
        incoming.push(order);
      }
    }
    return incoming.sort((a, b) => b.id - a.id);
  },

  // Mendapatkan order aktif yang sedang dijalankan oleh Driver (DITERIMA / DIJEMPUT / BERJALAN)
  getActiveOrder(driverId = 1): SharedOrder | null {
    const allOrders = Array.from(store.orders.values()).sort((a, b) => b.id - a.id);
    for (const order of allOrders) {
      if (
        !order.dismissedByDriver &&
        (order.driverId === driverId || order.driverId == null) &&
        (order.status === 'DITERIMA' ||
          order.status === 'DIJEMPUT' ||
          order.status === 'BERJALAN')
      ) {
        ensureRouteCoords(order);
        return order;
      }
    }
    return null;
  },

  // Tutup/arsipkan order selesai dari tampilan aktif Driver sehingga kembali siap di antrean pangkalan
  dismissOrder(orderId?: number): void {
    if (orderId) {
      const ord = store.orders.get(orderId);
      if (ord) ord.dismissedByDriver = true;
    } else {
      for (const ord of store.orders.values()) {
        if (ord.status === 'SELESAI' || ord.status === 'DIBATALKAN') {
          ord.dismissedByDriver = true;
        }
      }
    }
    store.driverStatus = 'ONLINE';
    syncDriverOneToFleet();
    savePersistedCache(store);
  },

  dismissOrderForDriver(orderId?: number): void {
    this.dismissOrder(orderId);
  },

  dismissOrderForPassenger(orderId?: number): void {
    if (orderId) {
      const ord = store.orders.get(orderId);
      if (ord) ord.dismissedByPassenger = true;
    } else {
      for (const ord of store.orders.values()) {
        if (ord.status === 'SELESAI' || ord.status === 'DIBATALKAN') {
          ord.dismissedByPassenger = true;
        }
      }
    }
    savePersistedCache(store);
  },

  // Batalkan / Tolak Order Masuk (Dari sisi Driver atau Penumpang)
  cancelOrder(orderId: number): SharedOrder | null {
    const order = this.getOrder(orderId);
    if (!order) return null;
    order.status = 'DIBATALKAN';
    order.dismissedByDriver = true;
    order.dismissedByPassenger = true;
    store.driverStatus = 'ONLINE';
    store.orders.set(order.id, order);
    syncDriverOneToFleet();
    savePersistedCache(store);
    return order;
  },

  // Driver Menerima Order (Transisi MENCARI_DRIVER -> DITERIMA)
  acceptOrder(orderId: number, driverId = 1, fallbackData?: Partial<SharedOrder>): SharedOrder | null {
    let order = store.orders.get(orderId);
    if (!order) {
      for (const o of store.orders.values()) {
        if (String(o.id) === String(orderId) || o.kode === String(orderId)) {
          order = o;
          break;
        }
      }
    }
    if (!order && fallbackData) {
      order = {
        id: Number(orderId),
        kode: fallbackData.kode || `ORD-${orderId}`,
        status: 'MENCARI_DRIVER',
        jemputAlamat: fallbackData.jemputAlamat || 'Titik Jemput Majalengka',
        jemputLat: Number(fallbackData.jemputLat) || -6.8362,
        jemputLng: Number(fallbackData.jemputLng) || 108.2281,
        tujuanAlamat: fallbackData.tujuanAlamat || 'Tujuan Majalengka',
        tujuanLat: Number(fallbackData.tujuanLat) || -6.8295,
        tujuanLng: Number(fallbackData.tujuanLng) || 108.2198,
        penumpangNama: fallbackData.penumpangNama || 'Penumpang',
        penumpangEmail: fallbackData.penumpangEmail || 'penumpang@becak.test',
        penumpangNoHp: fallbackData.penumpangNoHp || '081298765432',
        jarakKm: Number(fallbackData.jarakKm) || 2.5,
        durasiMenit: Number(fallbackData.durasiMenit) || 10,
        tarif: Number(fallbackData.tarif) || 10000,
        diskon: Number(fallbackData.diskon) || 0,
        totalBayar: Number(fallbackData.totalBayar) || 10000,
        serviceType: fallbackData.serviceType || 'REGULER',
        passengerCount: fallbackData.passengerCount || 1,
        catatan: fallbackData.catatan,
        metodePembayaran: fallbackData.metodePembayaran || 'QRIS',
        simulationProgress: 5,
        routeGeometry: fallbackData.routeGeometry || '[]',
        driverId: driverId,
        createdAt: fallbackData.createdAt || new Date().toISOString(),
      };
      store.orders.set(order.id, order);
    }
    if (!order) {
      const incoming = this.getIncomingOrders();
      if (incoming.length > 0) order = incoming[0];
    }
    if (!order) return null;

    for (const other of store.orders.values()) {
      if (other.id !== order.id && (other.status === 'SELESAI' || other.status === 'MENCARI_DRIVER')) {
        other.dismissedByDriver = true;
      }
    }

    const routeCoords = ensureRouteCoords(order);
    const approachRoute = generatePickupApproachRoute(
      order.jemputLat,
      order.jemputLng,
      routeCoords[1]
    );
    const startInterp = interpolateRoutePosition(approachRoute, 0);

    order.status = 'DITERIMA';
    order.driverId = driverId;
    order.dismissedByDriver = false;
    order.dismissedByPassenger = false;
    order.simulationProgress = 5;
    order.lastStepAt = Date.now();
    const defaultVehicle = {
      kodeUnit: 'BL-001',
      modelName: 'Becak Listrik Majalengka EV',
      warna: 'Biru Langit',
      kapasitas: 2,
      batteryPct: 94,
    };
    order.vehicle = defaultVehicle;
    order.driver = {
      id: driverId,
      currentLat: startInterp.position[0],
      currentLng: startInterp.position[1],
      heading: startInterp.heading,
      ratingAverage: store.driverRating,
      totalTrips: store.driverTotalTrips,
      user: { id: 2, nama: 'Budi Santoso', noHp: '081234560001' },
      vehicle: defaultVehicle,
    };
    store.driverStatus = 'ON_TRIP';
    store.orders.set(order.id, order);

    const existingChats = store.chatMessages.get(order.id) || [];
    if (existingChats.length === 0) {
      store.chatMessages.set(order.id, [
        {
          id: store.nextChatId++,
          orderId: order.id,
          senderRole: 'DRIVER',
          senderId: 2,
          senderNama: 'Budi Santoso (Driver BL-001)',
          pesan: `Halo Kak ${order.penumpangNama || 'Penumpang'}, pesanan menuju ${order.tujuanAlamat} sudah saya terima! Saya sedang meluncur ke titik jemput ya.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    syncDriverOneToFleet();
    savePersistedCache(store);
    return order;
  },

  // Mesin Langkah Simulasi Terpadu (Sinkron 100% antara Pelanggan, Driver & Admin)
  stepOrder(orderId: number, deltaPercent = 2, forceAdvance = false): SharedOrder | null {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const coords = ensureRouteCoords(order);
    const lastPos: LatLng =
      coords.length > 0 ? coords[coords.length - 1] : [order.tujuanLat, order.tujuanLng];

    if (order.status === 'SELESAI' || deltaPercent >= 100) {
      return this.updateOrderProgress(order.id, 100, 'SELESAI', lastPos, 0);
    }

    if (order.status === 'MENCARI_DRIVER' || order.status === 'DIBATALKAN') {
      return order;
    }

    const now = Date.now();
    if (!forceAdvance && order.lastStepAt && now - order.lastStepAt < 850) {
      return order;
    }
    order.lastStepAt = now;

    const currentProg = Math.max(5, Number(order.simulationProgress || 5));
    const step = forceAdvance ? Math.max(25, deltaPercent) : Math.max(1, Math.min(10, deltaPercent));
    const nextProg = Math.min(100, currentProg + step);

    if (nextProg >= 100) {
      return this.updateOrderProgress(order.id, 100, 'SELESAI', lastPos, 0);
    }

    if (nextProg < 24) {
      const approachCoords = generatePickupApproachRoute(
        order.jemputLat,
        order.jemputLng,
        coords[1]
      );
      const approachRatio = Math.min(100, (nextProg / 24) * 100);
      const interp = interpolateRoutePosition(approachCoords, approachRatio);
      const approachStatus = nextProg < 14 ? 'DITERIMA' : 'DIJEMPUT';
      return this.updateOrderProgress(
        order.id,
        nextProg,
        approachStatus,
        interp.position,
        interp.heading
      );
    }

    const routeRatio = Math.max(0, Math.min(100, ((nextProg - 24) / 76) * 100));
    const interp = interpolateRoutePosition(coords, routeRatio);
    return this.updateOrderProgress(
      order.id,
      nextProg,
      'BERJALAN',
      interp.position,
      interp.heading
    );
  },

  // Update Progres & Status Perjalanan
  updateOrderProgress(orderId: number, progress: number, status: SharedOrder['status'], location?: [number, number], heading?: number): SharedOrder | null {
    let order = store.orders.get(orderId);
    if (!order) {
      for (const o of store.orders.values()) {
        if (String(o.id) === String(orderId)) {
          order = o;
          break;
        }
      }
    }
    if (!order) return null;

    if (order.status === 'SELESAI' && status !== 'SELESAI') {
      return order;
    }

    order.simulationProgress = Math.max(order.simulationProgress || 0, progress);

    const statusPriority = ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN', 'SELESAI'];
    const currentIdx = statusPriority.indexOf(order.status);
    const targetIdx = statusPriority.indexOf(status);
    if (targetIdx >= currentIdx) {
      order.status = status;
    }
    const defaultVehicle = {
      kodeUnit: 'BL-001',
      modelName: 'Becak Listrik Majalengka EV',
      warna: 'Biru Langit',
      kapasitas: 2,
      batteryPct: 94,
    };
    if (!order.vehicle) {
      order.vehicle = defaultVehicle;
    }
    if (!order.driver) {
      order.driver = {
        id: order.driverId || 1,
        currentLat: location ? location[0] : order.jemputLat,
        currentLng: location ? location[1] : order.jemputLng,
        heading: heading ?? 0,
        ratingAverage: store.driverRating,
        totalTrips: store.driverTotalTrips,
        user: { id: 2, nama: 'Budi Santoso', noHp: '081234560001' },
        vehicle: order.vehicle || defaultVehicle,
      };
    } else if (location) {
      order.driver.currentLat = location[0];
      order.driver.currentLng = location[1];
      if (heading != null) order.driver.heading = heading;
    }

    if (status === 'SELESAI') {
      order.simulationProgress = 100;
      store.driverStatus = 'ONLINE';
      if (!order.countedInStats) {
        order.countedInStats = true;
        store.driverTotalTrips += 1;
        store.driverCompletedToday += 1;
        const netFare = Math.max(0, order.tarif - (order.diskon || 0));
        store.driverEarningsToday += netFare;
      }
    }
    store.orders.set(order.id, order);
    syncDriverOneToFleet();
    savePersistedCache(store);
    return order;
  },

  // Submit Rating & Tip dari Penumpang (Idempotent, mendukung Rp0 Tanpa Tip)
  submitRating(
    orderId: number,
    skor: number,
    kategori: string,
    komentar: string,
    tip?: number,
    timestamp?: number
  ): SharedRating {
    const order = store.orders.get(orderId) || this.getActiveOrder();
    const penumpangNama = order?.penumpangNama || 'Rina Kusuma';
    const cleanTip = typeof tip === 'number' && tip >= 0 ? tip : 0;
    const now = typeof timestamp === 'number' && timestamp > 0 ? timestamp : Date.now();

    if (order) {
      const baseTotal = Math.max(0, order.tarif - (order.diskon || 0));
      const prevCountedTip = order.countedTip || 0;
      const tipDelta = cleanTip - prevCountedTip;
      order.tip = cleanTip;
      order.countedTip = cleanTip;
      order.totalBayar = Math.max(0, baseTotal + cleanTip);
      order.status = 'SELESAI';
      order.simulationProgress = 100;
      if (!order.countedInStats) {
        order.countedInStats = true;
        store.driverTotalTrips += 1;
        store.driverCompletedToday += 1;
        store.driverEarningsToday += baseTotal;
      }
      if (tipDelta !== 0) {
        store.driverEarningsToday = Math.max(0, store.driverEarningsToday + tipDelta);
      }
      store.orders.set(order.id, order);
    }

    const existingIdx = store.ratings.findIndex((r) => r.orderId === orderId);
    const ruteText = order ? `${order.jemputAlamat} ➔ ${order.tujuanAlamat}` : undefined;

    const rating: SharedRating = {
      id: existingIdx >= 0 ? store.ratings[existingIdx].id : now,
      orderId,
      penumpangNama,
      driverNama: 'Budi Santoso',
      unit: 'BL-001',
      skor,
      kategori: kategori || 'Sangat Memuaskan',
      komentar: komentar || 'Pelayanan becak listrik yang sangat nyaman.',
      tip: cleanTip,
      rute: ruteText,
      createdAt: formatDynamicReviewTime(now, Date.now()),
      timestamp: now,
    };

    if (existingIdx >= 0) {
      store.ratings[existingIdx] = rating;
    } else {
      store.ratings.unshift(rating);
      const budiRatings = store.ratings.filter((r) => r.unit === 'BL-001');
      const avg =
        budiRatings.reduce((acc, r) => acc + r.skor, 0) / Math.max(1, budiRatings.length);
      store.driverRating = Math.round(Math.min(5, Math.max(4.8, (4.95 * 38 + avg * budiRatings.length) / (38 + budiRatings.length))) * 100) / 100;
    }

    store.ratings = sortRatingsNewestFirst(store.ratings);
    store.syncedHistoryIds.add(orderId);
    syncDriverOneToFleet();
    savePersistedCache(store);
    return rating;
  },

  // Sinkronisasi Riwayat Pesanan dari localStorage Browser Penumpang agar semua order sebelumnya masuk ke Driver & Admin
  syncPassengerHistory(trips: PassengerHistorySyncItem[]): void {
    if (!Array.isArray(trips) || trips.length === 0) return;
    let changed = false;
    const now = Date.now();

    for (const t of trips) {
      if (!t || !t.id) continue;
      // Abaikan 3 item seed default (990, 991, 1001) karena sudah ada di INITIAL_RATINGS dengan urutan waktu yang rapi
      if (t.id === 990 || t.id === 991 || t.id === 1001) continue;

      const passengerName =
        t.penumpangNama ||
        store.orders.get(t.id)?.penumpangNama ||
        'Edrick Andreas';
      const passengerEmail =
        t.penumpangEmail ||
        store.orders.get(t.id)?.penumpangEmail ||
        'edrick@gmail.com';

      const existingRatingIdx = store.ratings.findIndex(
        (r) => r.orderId === t.id || r.id === t.id
      );
      if (existingRatingIdx < 0) {
        const itemTs =
          typeof t.timestamp === 'number' && t.timestamp > 0
            ? t.timestamp
            : parseRatingTimestamp({ createdAt: t.tanggal, orderId: t.id }, now);
        const dynamicCreatedAt = formatDynamicReviewTime(itemTs, now);
        store.ratings.unshift({
          id: t.id,
          orderId: t.id,
          penumpangNama: passengerName,
          driverNama: t.driverNama || 'Budi Santoso',
          unit: t.driverUnit || 'BL-001',
          skor: t.ratingScore || 5,
          kategori: t.ratingCategory || 'Tepat Waktu & Hening',
          komentar: t.ratingComment || 'Perjalanan nyaman dan bebas polusi.',
          tip: t.tip || 0,
          rute: `${t.jemputAlamat} ➔ ${t.tujuanAlamat}`,
          createdAt: dynamicCreatedAt,
          timestamp: itemTs,
        });
        changed = true;
      }

      if (!store.syncedHistoryIds.has(t.id)) {
        store.syncedHistoryIds.add(t.id);
        if (!store.orders.has(t.id)) {
          store.driverTotalTrips += 1;
          store.driverCompletedToday += 1;
          store.driverEarningsToday += Number(t.totalBayar || t.tarif || 0);
          store.orders.set(t.id, {
            id: t.id,
            kode: t.kode || `ORD-${t.id}`,
            status: 'SELESAI',
            jemputAlamat: t.jemputAlamat,
            jemputLat: -6.8362,
            jemputLng: 108.2281,
            tujuanAlamat: t.tujuanAlamat,
            tujuanLat: -6.8385,
            tujuanLng: 108.2305,
            penumpangNama: passengerName,
            penumpangEmail: passengerEmail,
            penumpangNoHp: '081298765432',
            jarakKm: t.jarakKm || 1.5,
            durasiMenit: t.durasiMenit || 8,
            tarif: t.tarif || 9500,
            diskon: t.diskon || 0,
            totalBayar: t.totalBayar || 9500,
            tip: t.tip || 0,
            simulationProgress: 100,
            routeGeometry: '[]',
            driverId: 1,
            dismissedByDriver: true,
            dismissedByPassenger: true,
            countedInStats: true,
            countedTip: t.tip || 0,
            createdAt: new Date().toISOString(),
          });
          changed = true;
        }
      }
    }

    if (changed) {
      store.ratings = sortRatingsNewestFirst(store.ratings);
      syncDriverOneToFleet();
      savePersistedCache(store);
    }
  },

  // Chat In-App Real-Time antara Penumpang & Driver (Tersinkron penuh per orderId)
  getChatMessages(orderId: number): SharedChatMessage[] {
    const numId = Number(orderId);
    const directList = store.chatMessages.get(numId) || [];
    if (store.orders.has(numId) || directList.length > 0) {
      return directList;
    }
    const activeOrder = this.getActiveOrder();
    if (activeOrder) {
      return store.chatMessages.get(activeOrder.id) || [];
    }
    return directList;
  },

  addChatMessage(
    orderId: number,
    data: {
      senderRole: 'PENUMPANG' | 'DRIVER' | 'ADMIN';
      senderId?: number;
      senderNama: string;
      pesan: string;
    }
  ): SharedChatMessage {
    const numId = Number(orderId);
    const targetId = store.orders.has(numId)
      ? numId
      : this.getActiveOrder()?.id || numId;
    const list = store.chatMessages.get(targetId) || [];
    const newMsg: SharedChatMessage = {
      id: store.nextChatId++,
      orderId: targetId,
      senderRole: data.senderRole,
      senderId: data.senderId,
      senderNama: data.senderNama,
      pesan: data.pesan.trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    list.push(newMsg);
    store.chatMessages.set(targetId, list);
    if (targetId !== numId) {
      store.chatMessages.set(numId, list);
    }
    savePersistedCache(store);

    return newMsg;
  },

  // Dapatkan seluruh ulasan driver terurut dari yang terbaru ke terlama
  getDriverRating(): {
    rating: number;
    trips: number;
    reviews: SharedRating[];
    allReviews: SharedRating[];
  } {
    syncDriverOneToFleet();
    store.ratings = sortRatingsNewestFirst(store.ratings);
    const budiReviews = store.ratings.filter(
      (r) => r.unit === 'BL-001' || r.driverNama.toLowerCase().includes('budi')
    );
    return {
      rating: store.driverRating,
      trips: store.driverTotalTrips,
      reviews: budiReviews.slice(0, 30),
      allReviews: store.ratings.slice(0, 40),
    };
  },

  // Dapatkan statistik harian driver yang akurat (termasuk tip meskipun order telah di-dismiss)
  getDriverStats(): {
    completedToday: number;
    earningsToday: number;
    status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP';
  } {
    syncDriverOneToFleet();
    return {
      completedToday: store.driverCompletedToday,
      earningsToday: store.driverEarningsToday,
      status: store.driverStatus,
    };
  },

  getDriverStatus(): 'ONLINE' | 'OFFLINE' | 'ON_TRIP' {
    return store.driverStatus;
  },

  // Set Status Online / Offline Driver Utama
  setDriverStatus(status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP'): void {
    store.driverStatus = status;
    syncDriverOneToFleet();
    savePersistedCache(store);
  },

  // Dapatkan Daftar & Peringkat Driver secara Real-Time
  getFleetDrivers(): RankedFleetDriver[] {
    syncDriverOneToFleet();
    const maxTrips = Math.max(50, ...store.fleetDrivers.map((d) => d.trips));

    const scored = store.fleetDrivers.map((d) => {
      const ratingNorm = (d.rating / 5) * 45; // 45% bobot rating
      const tripsNorm = Math.min(1, d.trips / maxTrips) * 30; // 30% bobot jumlah perjalanan
      const onTimeNorm = (d.onTimeRate / 100) * 15; // 15% bobot ketepatan waktu
      const ecoNorm = (d.ecoScore / 100) * 10; // 10% bobot efisiensi baterai
      const performanceScore = Math.round((ratingNorm + tripsNorm + onTimeNorm + ecoNorm) * 10) / 10;
      return {
        ...d,
        performanceScore,
        statusLabel: (d.status === 'ONLINE'
          ? 'Online'
          : d.status === 'ON_TRIP'
          ? 'Dalam perjalanan'
          : 'Offline') as RankedFleetDriver['statusLabel'],
      };
    });

    scored.sort((a, b) => {
      if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
      if (b.trips !== a.trips) return b.trips - a.trips;
      return b.income - a.income;
    });

    const badges = [
      '🏆 Peringkat 1 · Driver Terbaik',
      '🥈 Peringkat 2 · Driver Unggulan',
      '🥉 Peringkat 3 · Driver Teladan',
      '⭐ Driver Aktif',
      '⚡ Driver Aktif',
      '🛡️ Driver Pangkalan',
    ];

    return scored.map((d, index) => ({
      ...d,
      rank: index + 1,
      badge: badges[index] || '🛡️ Driver Pangkalan',
    }));
  },

  // Tambah Driver Baru dari Dashboard Admin
  addFleetDriver(data: { nama: string; email: string; noHp?: string; kodeUnit: string }): RankedFleetDriver {
    const nextRawId =
      store.fleetDrivers.reduce((max, d) => Math.max(max, d.rawId), 0) + 1;
    const newDrv: SharedFleetDriver = {
      rawId: nextRawId,
      id: `DRV-${String(nextRawId).padStart(3, '0')}`,
      nama: data.nama.trim(),
      email: data.email.trim().toLowerCase(),
      noHp: data.noHp?.trim() || `08123456000${nextRawId}`,
      unit: data.kodeUnit.trim().toUpperCase(),
      status: 'ONLINE',
      battery: 95,
      trips: 12,
      completedToday: 2,
      income: 118000,
      tipsReceived: 5000,
      rating: 4.9,
      onTimeRate: 97,
      ecoScore: 96,
      koridor: 'Alun-Alun · Pusat Kota Majalengka',
      lat: -6.8362 + (nextRawId % 5) * 0.0012,
      lng: 108.2281 + (nextRawId % 4) * 0.0012,
      heading: (nextRawId * 60) % 360,
    };
    store.fleetDrivers.push(newDrv);
    savePersistedCache(store);
    const ranked = this.getFleetDrivers();
    return ranked.find((r) => r.rawId === nextRawId) || ranked[ranked.length - 1];
  },

  // Ubah Status Online/Offline Driver dari Dashboard Admin
  setFleetDriverStatus(rawId: number, status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP'): SharedFleetDriver | null {
    if (rawId === 1) {
      store.driverStatus = status;
    }
    const target = store.fleetDrivers.find((d) => d.rawId === rawId);
    if (target) {
      target.status = status;
      savePersistedCache(store);
      return target;
    }
    return null;
  },

  // Statistik Real-Time Lengkap untuk Dashboard Admin
  getAdminLiveStats() {
    const rankedDrivers = this.getFleetDrivers();
    const allLiveOrders = Array.from(store.orders.values()).sort((a, b) => b.id - a.id);

    const activeRuntimeOrders = allLiveOrders.filter((o) =>
      ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN'].includes(o.status)
    );
    const completedRuntimeOrders = allLiveOrders.filter((o) => o.status === 'SELESAI');
    const cancelledRuntimeOrders = allLiveOrders.filter((o) => o.status === 'DIBATALKAN');

    const totalTripsFleet = rankedDrivers.reduce((acc, d) => acc + d.trips, 0);
    const totalTodayFleet = rankedDrivers.reduce((acc, d) => acc + d.completedToday, 0);
    const totalIncomeFleet = rankedDrivers.reduce((acc, d) => acc + d.income, 0);
    const totalTipsFleet = rankedDrivers.reduce((acc, d) => acc + d.tipsReceived, 0);

    const onlineCount = rankedDrivers.filter((d) => d.status === 'ONLINE').length;
    const onTripCount = rankedDrivers.filter((d) => d.status === 'ON_TRIP').length;
    const offlineCount = rankedDrivers.filter((d) => d.status === 'OFFLINE').length;

    const extraKm = completedRuntimeOrders.reduce((acc, o) => acc + (o.jarakKm || 1.6), 0);
    const totalKm = Math.round((284.5 + extraKm) * 10) / 10;
    const ecoMetrics = calculateEcoImpact(totalKm, totalTripsFleet);

    const todayRevenue =
      175000 + Math.max(0, store.driverEarningsToday - 78000);

    const trend = [
      { d: 'Kam', date: 'Hari -6', count: 24, revenue: 235000 },
      { d: 'Jum', date: 'Hari -5', count: 31, revenue: 310000 },
      { d: 'Sab', date: 'Hari -4', count: 42, revenue: 425000 },
      { d: 'Min', date: 'Hari -3', count: 46, revenue: 468000 },
      { d: 'Sen', date: 'Hari -2', count: 28, revenue: 282000 },
      { d: 'Sel', date: 'Kemarin', count: 35, revenue: 355000 },
      {
        d: 'Hari Ini',
        date: 'Hari Ini',
        count: totalTodayFleet,
        revenue: todayRevenue,
      },
    ];

    store.ratings = sortRatingsNewestFirst(store.ratings);

    return {
      orders: {
        total: totalTripsFleet + activeRuntimeOrders.length + cancelledRuntimeOrders.length,
        today: totalTodayFleet + activeRuntimeOrders.length,
        active: activeRuntimeOrders.length,
        completed: totalTripsFleet,
        cancelled: cancelledRuntimeOrders.length,
      },
      drivers: {
        total: rankedDrivers.length,
        online: onlineCount,
        onTrip: onTripCount,
        offline: offlineCount,
      },
      vehicles: {
        total: rankedDrivers.length,
        active: onlineCount + onTripCount,
        charging: offlineCount,
        available: onlineCount,
      },
      revenue: {
        total: totalIncomeFleet,
        today: todayRevenue,
        totalTips: totalTipsFleet,
      },
      eco: ecoMetrics,
      trend,
      driversLocation: rankedDrivers.map((d) => ({
        id: d.rawId,
        nama: d.nama,
        unit: d.unit,
        battery: d.battery,
        status: d.status,
        lat: d.lat,
        lng: d.lng,
        heading: d.heading,
      })),
      liveOrders: allLiveOrders.slice(0, 12),
      recentReviews: store.ratings.slice(0, 20),
      rankedDrivers,
      pangkalan: {
        id: 1,
        nama: 'Pangkalan Becak Listrik Alun-Alun Majalengka',
        alamat: 'Kawasan Alun-Alun Jl. KH Abdul Halim, Majalengka',
        lat: -6.8362,
        lng: 108.2281,
        radiusKm: 4.2,
      },
    };
  },

  // Registrasi Akun Penumpang Baru (Tersimpan di Memori Server & Terintegrasi Login)
  registerUser(data: {
    nama: string;
    email: string;
    noHp: string;
    password: string;
    role?: 'PENUMPANG' | 'DRIVER' | 'ADMIN';
  }): SharedRegisteredUser {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = store.registeredUsers.get(cleanEmail);
    if (existing) {
      existing.nama = data.nama.trim();
      existing.noHp = data.noHp.trim();
      existing.password = data.password;
      savePersistedCache(store);
      return existing;
    }
    const newUser: SharedRegisteredUser = {
      id: store.nextUserId++,
      nama: data.nama.trim(),
      email: cleanEmail,
      noHp: data.noHp.trim() || '081200000000',
      password: data.password,
      role: data.role || 'PENUMPANG',
      createdAt: new Date().toISOString(),
    };
    store.registeredUsers.set(cleanEmail, newUser);
    savePersistedCache(store);
    return newUser;
  },

  findUserByEmail(email: string): SharedRegisteredUser | null {
    return store.registeredUsers.get(email.trim().toLowerCase()) || null;
  },

  getRegisteredUsers(): SharedRegisteredUser[] {
    return Array.from(store.registeredUsers.values());
  },

  // Reset Data
  resetScenario(): void {
    store.orders.clear();
    store.chatMessages.clear();
    store.ratings = sortRatingsNewestFirst([...INITIAL_RATINGS]);
    store.fleetDrivers = INITIAL_FLEET_DRIVERS.map((d) => ({ ...d }));
    store.syncedHistoryIds = new Set<number>([990, 991]);
    store.driverStatus = 'ONLINE';
    store.driverRating = 4.95;
    store.driverTotalTrips = 48;
    store.driverCompletedToday = 6;
    store.driverEarningsToday = 78000;
    store.nextOrderId = 1000;
    savePersistedCache(store);
  },
};
