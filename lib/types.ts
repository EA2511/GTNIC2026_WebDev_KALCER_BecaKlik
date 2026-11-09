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
  rating?: {
    skor: number;
    kategori?: string;
    komentar?: string;
  };
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
