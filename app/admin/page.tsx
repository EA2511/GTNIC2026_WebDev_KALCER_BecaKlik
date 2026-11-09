'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  Bike,
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Zap,
  Leaf,
  RotateCcw,
  Play,
  Star,
  Trophy,
  Sparkles,
} from 'lucide-react';
import MapWrapper from '@/components/map/MapWrapper';

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

interface LiveOrderItem {
  id: number;
  kode: string;
  status: string;
  penumpangNama: string;
  jemputAlamat: string;
  tujuanAlamat: string;
  jarakKm: number;
  tarif: number;
  totalBayar: number;
  tip?: number;
  simulationProgress: number;
  serviceType?: string;
}

interface StatsData {
  orders: {
    total: number;
    today: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  drivers: {
    total: number;
    online: number;
    onTrip: number;
    offline: number;
  };
  vehicles: {
    total: number;
    active: number;
    charging: number;
    available: number;
  };
  revenue: {
    total: number;
    today: number;
    totalTips?: number;
  };
  eco: {
    totalKm: number;
    totalTrips: number;
    energyConsumedKwh: number;
    operationalCo2Kg: number;
    avoidedCo2Kg: number;
    gasolineSavedLiters: number;
    costSavingsRupiah: number;
    treeEquivalence: number;
    methodologyNote: string;
  };
  trend: Array<{ d: string; date: string; count: number; revenue: number }>;
  driversLocation: Array<{
    id: number;
    nama: string;
    unit: string;
    battery: number;
    status: string;
    lat: number;
    lng: number;
    heading: number;
  }>;
  liveOrders?: LiveOrderItem[];
  pangkalan?: {
    nama: string;
    alamat: string;
    lat: number;
    lng: number;
    radiusKm: number;
  };
}

interface DriverRow {
  id: string;
  rawId: number;
  nama: string;
  email: string;
  noHp: string;
  unit: string;
  status: string;
  rawStatus?: string;
  trips: number;
  completedToday?: number;
  income: number;
  tipsReceived?: number;
  battery: number;
  rating?: number;
  rank?: number;
  performanceScore?: number;
  badge?: string;
  onTimeRate?: number;
  ecoScore?: number;
  koridor?: string;
}

interface AdminReview {
  id: number;
  orderId?: number;
  penumpangNama: string;
  driverNama: string;
  unit: string;
  skor: number;
  kategori: string;
  komentar: string;
  tip?: number;
  rute?: string;
  createdAt: string;
  timestamp?: number;
}

function formatAdminReviewDynamicTime(
  rev: AdminReview,
  now: number = Date.now(),
): string {
  const ts =
    typeof rev.timestamp === "number" && rev.timestamp > 0
      ? rev.timestamp
      : (1700000000000 + (rev.orderId || rev.id || 0));

  const diffMs = Math.max(0, now - ts);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 45) return "Baru saja";
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const WIB_OFFSET = 7 * 3600 * 1000;
  const reviewWib = new Date(ts + WIB_OFFSET);
  const nowWib = new Date(now + WIB_OFFSET);

  const rYear = reviewWib.getUTCFullYear();
  const rMonth = reviewWib.getUTCMonth();
  const rDate = reviewWib.getUTCDate();
  const rHours = String(reviewWib.getUTCHours()).padStart(2, "0");
  const rMinutes = String(reviewWib.getUTCMinutes()).padStart(2, "0");
  const timeStr = `${rHours}:${rMinutes}`;

  const nYear = nowWib.getUTCFullYear();
  const nMonth = nowWib.getUTCMonth();
  const nDate = nowWib.getUTCDate();

  const rDayTimestamp = Date.UTC(rYear, rMonth, rDate);
  const nDayTimestamp = Date.UTC(nYear, nMonth, nDate);
  const calendarDaysDiff = Math.round(
    (nDayTimestamp - rDayTimestamp) / (24 * 3600 * 1000),
  );

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

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${rDate} ${months[rMonth]} ${rYear}, ${timeStr}`;
}

function mergeAdminReviews(
  prev: AdminReview[],
  incoming: AdminReview[],
): AdminReview[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev;
  const map = new Map<string, AdminReview>();

  const getKey = (r: AdminReview) => {
    if (r.orderId != null) return `ord-${r.orderId}`;
    if (r.id != null && r.id < 1_000_000_000_000) return `ord-${r.id}`;
    return `id-${r.id}`;
  };

  for (const r of incoming) {
    if (r && (r.id != null || r.orderId != null)) {
      map.set(getKey(r), r);
    }
  }

  for (const r of prev) {
    if (r && (r.id != null || r.orderId != null)) {
      const key = getKey(r);
      const existing = map.get(key);
      if (existing) {
        if (!existing.penumpangNama || existing.penumpangNama === "Pelanggan BecakListrik") {
          existing.penumpangNama = r.penumpangNama || existing.penumpangNama;
        }
      } else {
        map.set(key, r);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const tsA = typeof a.timestamp === 'number' && a.timestamp > 0 ? a.timestamp : (1700000000000 + (a.orderId || a.id || 0));
    const tsB = typeof b.timestamp === 'number' && b.timestamp > 0 ? b.timestamp : (1700000000000 + (b.orderId || b.id || 0));
    if (tsB !== tsA) return tsB - tsA;
    return (b.orderId || b.id || 0) - (a.orderId || a.id || 0);
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('becak_admin_reviews');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [currentClientTime, setCurrentClientTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentClientTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && reviews.length > 0) {
      try {
        localStorage.setItem('becak_admin_reviews', JSON.stringify(reviews));
      } catch {}
    }
  }, [reviews]);

  const sortedAdminReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const tsA = typeof a.timestamp === 'number' && a.timestamp > 0 ? a.timestamp : (1700000000000 + (a.orderId || a.id || 0));
      const tsB = typeof b.timestamp === 'number' && b.timestamp > 0 ? b.timestamp : (1700000000000 + (b.orderId || b.id || 0));
      if (tsB !== tsA) return tsB - tsA;
      return (b.orderId || b.id || 0) - (a.orderId || a.id || 0);
    });
  }, [reviews]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua status');
  const [sortBy, setSortBy] = useState<'rank' | 'trips' | 'income' | 'rating'>('rank');
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Real-Time Aktif');

  // Form tambah driver baru
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUnit, setNewUnit] = useState('BL-007');

  // Demo Control State
  const [demoActionLoading, setDemoActionLoading] = useState(false);

  // Load Dashboard Data from Server
  const loadData = useCallback(async () => {
    try {
      const [statsRes, driversRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/drivers'),
      ]);
      const statsJson = await statsRes.json();
      const driversJson = await driversRes.json();

      if (statsRes.ok) setStats(statsJson);
      if (driversRes.ok && driversJson.drivers) setDrivers(driversJson.drivers);
      if (driversRes.ok && Array.isArray(driversJson.recentReviews) && driversJson.recentReviews.length > 0) {
        setReviews((prev) => mergeAdminReviews(prev, driversJson.recentReviews));
      }
      setLastSyncTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAdminData = async () => {
      try {
        const [statsRes, driversRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/drivers'),
        ]);
        const statsJson = await statsRes.json();
        const driversJson = await driversRes.json();

        if (!active) return;
        if (statsRes.ok && statsJson) {
          setStats((prev) => {
            if (!prev) return statsJson;
            const mergedLive = (statsJson.liveOrders || []).map((incoming: LiveOrderItem) => {
              const existing = prev.liveOrders?.find((p) => p.id === incoming.id);
              if (existing) {
                const priorityOrder = ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN', 'SELESAI'];
                const existingIdx = priorityOrder.indexOf(existing.status);
                const incomingIdx = priorityOrder.indexOf(incoming.status);
                if (existingIdx > incomingIdx) {
                  return { ...incoming, status: existing.status };
                }
              }
              return incoming;
            });
            return { ...statsJson, liveOrders: mergedLive };
          });
        }
        if (driversRes.ok && driversJson.drivers) setDrivers(driversJson.drivers);
        if (driversRes.ok && Array.isArray(driversJson.recentReviews) && driversJson.recentReviews.length > 0) {
          setReviews((prev) => mergeAdminReviews(prev, driversJson.recentReviews));
        }
        setLastSyncTime(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (e) {
        console.error('Error in periodic admin polling:', e);
      }
    };

    void fetchAdminData();
    // Polling stabil 3.0 detik agar hemat bandwidth dan mencegah race-condition antar serverless instance
    const interval = setInterval(() => {
      if (active) void fetchAdminData();
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Top 3 Podium Drivers (Selalu diurutkan berdasarkan peringkat performa)
  const topThreeDrivers = useMemo(() => {
    return [...drivers]
      .sort((a, b) => (a.rank || 99) - (b.rank || 99))
      .slice(0, 3);
  }, [drivers]);

  // Filter & Sort Driver Table
  const filteredAndSortedDrivers = useMemo(() => {
    const list = drivers.filter((d) => {
      const matchQuery =
        d.nama.toLowerCase().includes(query.toLowerCase()) ||
        d.unit.toLowerCase().includes(query.toLowerCase()) ||
        d.id.toLowerCase().includes(query.toLowerCase()) ||
        (d.koridor || '').toLowerCase().includes(query.toLowerCase());

      if (filter === 'Online') return matchQuery && d.status === 'Online';
      if (filter === 'Dalam perjalanan') return matchQuery && d.status === 'Dalam perjalanan';
      if (filter === 'Offline') return matchQuery && d.status === 'Offline';
      return matchQuery;
    });

    return list.sort((a, b) => {
      if (sortBy === 'trips') return b.trips - a.trips;
      if (sortBy === 'income') return b.income - a.income;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return (a.rank || 99) - (b.rank || 99);
    });
  }, [drivers, query, filter, sortBy]);

  // Tambah Driver Baru
  async function handleAddDriver(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: newName,
          email: newEmail,
          kodeUnit: newUnit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.message || 'Gagal menambahkan driver.');
        return;
      }

      setNotice(data.message || 'Mitra pengemudi berhasil didaftarkan ke sistem.');
      setNewName('');
      setNewEmail('');
      setNewUnit(`BL-00${drivers.length + 2}`);
      setShowAdd(false);
      await loadData();
    } catch {
      setNotice('Terjadi kesalahan saat menyimpan data driver.');
    }
  }

  // Toggle Driver Online / Offline
  async function toggleDriverStatus(driverId: number, currentStatus: string) {
    try {
      const targetAction = currentStatus === 'Offline' ? 'SET_ONLINE' : 'SET_OFFLINE';
      const targetStatus = currentStatus === 'Offline' ? 'ONLINE' : 'OFFLINE';
      await fetch('/api/admin/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          action: targetAction,
          status: targetStatus,
        }),
      });
      await loadData();
    } catch (e) {
      console.error('Error toggling driver status:', e);
    }
  }

  // Reset Skenario Demo
  async function handleResetDemo() {
    setDemoActionLoading(true);
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' });
      const data = await res.json();
      setNotice(data.message || 'Skenario demo berhasil di-reset ke kondisi awal.');
      await loadData();
    } catch {
      setNotice('Gagal me-reset skenario demo.');
    } finally {
      setDemoActionLoading(false);
    }
  }

  // Ekspor CSV Lengkap dengan Peringkat & Skor Performa
  function exportCsv() {
    const headers = [
      [
        'Peringkat',
        'ID Driver',
        'Nama',
        'Email',
        'Unit',
        'Status',
        'Skor Performa',
        'Rating',
        'Perjalanan',
        'Pendapatan (IDR)',
        'Tip Diterima (IDR)',
      ],
      ...drivers.map((d) => [
        `#${d.rank || '-'}`,
        d.id,
        d.nama,
        d.email,
        d.unit,
        d.status,
        d.performanceScore || 95,
        d.rating || 4.9,
        d.trips,
        d.income,
        d.tipsReceived || 0,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      headers.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `peringkat-mitra-becaklik-majalengka-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Admin Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // offline
    }
    router.replace('/login?role=admin');
  };

  const maxRevenue = Math.max(
    1,
    ...(stats?.trend?.map((t) => t.revenue) || [100000])
  );

  const activeLiveOrders = (stats?.liveOrders || []).filter((o) =>
    ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN'].includes(o.status)
  );

  return (
    <main className="app-page admin-page">
      <div className="container">
        {/* Executive Command Center Header */}
        <div
          className="dashboard-top"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 55%, #0284c7 100%)',
            color: '#ffffff',
            padding: '28px 30px',
            borderRadius: '24px',
            boxShadow: '0 20px 45px -15px rgba(2, 132, 199, 0.35)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            marginBottom: '20px',
          }}
        >
          <div style={{ maxWidth: '680px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(56, 189, 248, 0.18)',
                border: '1px solid rgba(125, 211, 252, 0.4)',
                color: '#7dd3fc',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 10px #4ade80',
                }}
              />
              ADMIN PANGKALAN · KABUPATEN MAJALENGKA
            </div>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
              Dashboard Operasional{' '}
              <span style={{ color: '#38bdf8' }}>BecaKlik Majalengka</span>
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0, lineHeight: 1.55 }}>
              Pantau posisi becak listrik yang sedang beroperasi, peringkat driver, pendapatan harian, dan ulasan penumpang.
            </p>
          </div>

          <div
            className="admin-actions"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  color: '#e0f2fe',
                  border: '1px solid rgba(125, 211, 252, 0.35)',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#38bdf8',
                  }}
                />
                Update: {lastSyncTime}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(22, 163, 74, 0.25)',
                  color: '#bbf7d0',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                ⚡ {stats?.vehicles.active ?? 6} dari {stats?.vehicles.total ?? 6} Unit Beroperasi
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="button button-primary"
                onClick={() => {
                  setShowAdd(!showAdd);
                  setNotice('');
                }}
                style={{
                  background: '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 800,
                  border: 'none',
                }}
              >
                <Plus size={17} /> Tambah Driver Baru
              </button>
              <button
                className="button button-outline"
                onClick={handleLogout}
                title="Keluar dari akun admin"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Quick Navigation Bar */}
        <div
          style={{
            background: '#ffffff',
            padding: '14px 20px',
            borderRadius: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
            border: '1.5px solid #bae6fd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Zap size={19} />
            </span>
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                Pintasan Halaman & Reset Data
              </strong>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Semua pesanan baru, posisi driver di peta, ulasan, dan tip dari halaman penumpang maupun driver langsung tercatat otomatis di sini.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/pelanggan"
              className="button button-small"
              style={{
                background: '#0284c7',
                color: 'white',
                border: '1px solid #0284c7',
                fontWeight: 700,
              }}
            >
              <Play size={14} /> Halaman Penumpang
            </Link>
            <Link
              href="/driver"
              className="button button-small"
              style={{
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #7dd3fc',
                fontWeight: 700,
              }}
            >
              <Bike size={14} /> Halaman Driver
            </Link>
            <button
              type="button"
              className="button button-small"
              onClick={handleResetDemo}
              disabled={demoActionLoading}
              style={{
                background: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: 700,
              }}
            >
              <RotateCcw size={14} /> Reset Data
            </button>
          </div>
        </div>

        {/* Active Trip Banner */}
        {activeLiveOrders.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #38bdf8',
              borderRadius: '18px',
              padding: '16px 20px',
              boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '999px',
                  }}
                >
                  ● PESANAN SEDANG BERJALAN
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  {activeLiveOrders.length} Perjalanan Sedang Berlangsung
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 700 }}>
                Pangkalan Majalengka
              </span>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {activeLiveOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#0284c7' }}>{ord.kode}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: ord.status === 'MENCARI_DRIVER' ? '#fef3c7' : '#dcfce7',
                          color: ord.status === 'MENCARI_DRIVER' ? '#92400e' : '#166534',
                        }}
                      >
                        {ord.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#334155', fontWeight: 700 }}>
                        Penumpang: {ord.penumpangNama}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      📍 <strong>{ord.jemputAlamat}</strong> ➔ 🎯 <strong>{ord.tujuanAlamat}</strong> ({ord.jarakKm} km)
                    </div>
                  </div>

                  <div style={{ minWidth: '180px', textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      {currency(ord.totalBayar || ord.tarif)} · Progres {Math.round(ord.simulationProgress || 0)}%
                    </div>
                    <div
                      style={{
                        height: '7px',
                        background: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(5, ord.simulationProgress || 5)}%`,
                          background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {notice && (
          <div className="inline-notice" style={{ marginTop: '16px' }}>
            <Check size={17} />
            {notice}
            <button onClick={() => setNotice('')} aria-label="Tutup pemberitahuan">
              ×
            </button>
          </div>
        )}

        {/* Add Driver Form */}
        {showAdd && (
          <form className="panel add-driver-form" onSubmit={handleAddDriver} style={{ marginTop: '16px' }}>
            <div>
              <span className="panel-kicker">PENDAFTARAN MITRA PENGEMUDI BARU</span>
              <h2>Pendaftaran Pengemudi & Unit Baru</h2>
            </div>
            <label>
              Nama Lengkap
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Contoh: Triyono Wibowo"
              />
            </label>
            <label>
              Alamat Email (Login)
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="triyono@becak.test"
              />
            </label>
            <label>
              Kode Unit Becak Listrik
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                required
                placeholder="Contoh: BL-007"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setShowAdd(false)}
              >
                Batal
              </button>
              <button className="button button-primary" type="submit">
                <Plus size={16} /> Daftarkan Pengemudi
              </button>
            </div>
          </form>
        )}

        {/* KPI Stats Grid (Real-Time) */}
        <div className="stats-grid admin-stats" style={{ marginTop: '20px' }}>
          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
              border: '1px solid #bbf7d0',
            }}
          >
            <span className="stat-icon stat-green">
              <CircleDollarSign />
            </span>
            <span className="stat-label">Total Omzet & Tip Mitra</span>
            <strong style={{ color: '#15803d' }}>
              {currency(stats?.revenue.total || 2105000)}
            </strong>
            <small className="stat-positive">
              <ArrowUpRight size={14} /> Hari ini: {currency(stats?.revenue.today || 175000)} (Tip:{' '}
              {currency(stats?.revenue.totalTips || 104000)})
            </small>
          </div>

          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
              border: '1px solid #bae6fd',
            }}
          >
            <span className="stat-icon stat-blue">
              <Users />
            </span>
            <span className="stat-label">Mitra Pengemudi Terdaftar</span>
            <strong style={{ color: '#0369a1' }}>{stats?.drivers.total ?? 6} Mitra</strong>
            <small>
              ● {stats?.drivers.online ?? 5} Siaga · {stats?.drivers.onTrip ?? 0} Mengantar ·{' '}
              {stats?.drivers.offline ?? 1} Istirahat
            </small>
          </div>

          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fefce8 100%)',
              border: '1px solid #fde68a',
            }}
          >
            <span
              className="stat-icon"
              style={{ background: '#fef9c3', color: '#a16207' }}
            >
              <Trophy />
            </span>
            <span className="stat-label">Rata-Rata Rating</span>
            <strong style={{ color: '#854d0e' }}>4.95 / 5.0 ★</strong>
            <small style={{ color: '#a16207', fontWeight: 700 }}>
              Dari {reviews.length} Ulasan & {stats?.orders.completed ?? 48} Perjalanan
            </small>
          </div>

          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)',
              border: '1px solid #e9d5ff',
            }}
          >
            <span className="stat-icon stat-purple">
              <Activity />
            </span>
            <span className="stat-label">Total Perjalanan Selesai</span>
            <strong style={{ color: '#6b21a8' }}>
              {stats?.orders.completed ?? 48} Trip
            </strong>
            <small className="stat-positive">
              ⚡ {stats?.orders.today ?? 27} Trip Hari Ini · {stats?.orders.active ?? 0} Aktif
            </small>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 🏆 PERINGKAT DRIVER TERBAIK */}
        {/* ============================================================== */}
        <section
          className="panel"
          style={{
            marginTop: '24px',
            padding: '28px',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            border: '1.5px solid #bae6fd',
            boxShadow: '0 14px 35px -10px rgba(2, 132, 199, 0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '22px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fef9c3',
                  color: '#854d0e',
                  border: '1px solid #fde047',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginBottom: '6px',
                }}
              >
                <Trophy size={13} /> PERINGKAT DRIVER PANGKALAN
              </div>
              <h2 style={{ fontSize: '22px', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                Peringkat Driver Terbaik Majalengka
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                Diurutkan berdasarkan rating penumpang, jumlah tarikan selesai, dan ketepatan waktu jemput.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#0369a1',
                fontWeight: 700,
              }}
            >
              <Sparkles size={16} color="#0284c7" />
              <span>Update Otomatis</span>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
            }}
          >
            {topThreeDrivers.map((drv, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
              const rankTitle = isFirst
                ? 'PERINGKAT #1 · DRIVER TERBAIK'
                : isSecond
                ? 'PERINGKAT #2 · DRIVER UNGGULAN'
                : 'PERINGKAT #3 · DRIVER TELADAN';
              const cardBorder = isFirst
                ? '2px solid #eab308'
                : isSecond
                ? '1.5px solid #38bdf8'
                : '1.5px solid #f59e0b';
              const headerBg = isFirst
                ? 'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)'
                : isSecond
                ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'
                : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)';
              const headerText = isFirst ? '#713f12' : isSecond ? '#0c4a6e' : '#7c2d12';

              return (
                <div
                  key={drv.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: cardBorder,
                    overflow: 'hidden',
                    boxShadow: isFirst
                      ? '0 16px 32px -8px rgba(234, 179, 8, 0.25)'
                      : '0 8px 20px -6px rgba(15, 23, 42, 0.08)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      background: headerBg,
                      color: headerText,
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 900,
                      letterSpacing: '0.4px',
                    }}
                  >
                    <span>
                      {medalEmoji} {rankTitle}
                    </span>
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.75)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 800,
                      }}
                    >
                      Skor: {drv.performanceScore || 98.5}/100
                    </span>
                  </div>

                  <div style={{ padding: '18px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: isFirst
                            ? 'linear-gradient(135deg, #eab308, #ca8a04)'
                            : 'linear-gradient(135deg, #0284c7, #0369a1)',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '18px',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
                        }}
                      >
                        {drv.nama
                          .split(' ')
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {drv.nama}
                          </strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#0284c7',
                              background: '#f0f9ff',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              border: '1px solid #bae6fd',
                            }}
                          >
                            ⚡ {drv.unit}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          📍 {drv.koridor || 'Koridor Utama Majalengka'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px',
                        background: '#f8fafc',
                        padding: '10px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                          Rating
                        </span>
                        <strong style={{ fontSize: '14px', color: '#854d0e' }}>
                          ★ {(drv.rating || 4.95).toFixed(2)}
                        </strong>
                      </div>
                      <div
                        style={{
                          borderLeft: '1px solid #e2e8f0',
                          borderRight: '1px solid #e2e8f0',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                          Total Trip
                        </span>
                        <strong style={{ fontSize: '14px', color: '#0284c7' }}>
                          {drv.trips} Trip
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                          Pendapatan
                        </span>
                        <strong style={{ fontSize: '13px', color: '#15803d' }}>
                          {currency(drv.income)}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: '#475569',
                      }}
                    >
                      <span>🎁 Tip: {currency(drv.tipsReceived || 0)}</span>
                      <span>⏱️ Tepat Waktu: {drv.onTimeRate || 98}%</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        🔋 {drv.battery}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Fleet Operational Live Map & Environmental Impact Module */}
        <div className="admin-impact-grid" style={{ marginTop: '24px' }}>
          {/* Left: Operational Fleet Live Map */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="panel-kicker">PETA ARMADA</span>
                <h2 style={{ fontSize: '18px' }}>Peta Posisi Becak Listrik Majalengka</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Posisi becak listrik yang sedang beroperasi di {stats?.pangkalan?.nama || 'Kawasan Kota Majalengka'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#155e38' }}>
                  ● {stats?.drivers.online ?? 5} Online
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#0284c7' }}>
                  ● {stats?.drivers.onTrip ?? 0} Di Jalan
                </span>
              </div>
            </div>

            <MapWrapper
              center={
                stats?.pangkalan
                  ? [stats.pangkalan.lat, stats.pangkalan.lng]
                  : [-6.8362, 108.2281]
              }
              zoom={14}
              allDrivers={stats?.driversLocation || []}
              zoneRadiusKm={stats?.pangkalan?.radiusKm || 4.2}
              height="clamp(320px, 45vh, 460px)"
              mode="admin"
            />
          </div>

          {/* Right: Environmental Impact Card */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Leaf size={18} />
                </span>
                <div>
                  <span className="panel-kicker" style={{ margin: 0 }}>
                    RAMAH LINGKUNGAN
                  </span>
                  <h2 style={{ fontSize: '18px', margin: 0 }}>Penghematan BBM & Polusi</h2>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                Perbandingan pemakaian becak listrik dibanding motor bensin untuk jarak tempuh yang sama di Majalengka.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Total Jarak Tempuh</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>
                    {stats?.eco.totalKm || 284.5} km
                  </div>
                  <small style={{ fontSize: '11px', color: '#94a3b8' }}>Operasional armada</small>
                </div>

                <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <span style={{ fontSize: '11px', color: '#0369a1' }}>Asap Polusi Berkurang</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>
                    {stats?.eco.avoidedCo2Kg || 19.25} kg
                  </div>
                  <small style={{ fontSize: '11px', color: '#0284c7' }}>Dibanding motor bensin</small>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>BBM Bensin Terhemat</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {stats?.eco.gasolineSavedLiters || 7.45} Liter
                  </div>
                  <small style={{ fontSize: '11px', color: '#94a3b8' }}>~{currency(stats?.eco.costSavingsRupiah || 98500)}</small>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Daya Listrik Terpakai</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {stats?.eco.energyConsumedKwh || 9.95} kWh
                  </div>
                  <small style={{ fontSize: '11px', color: '#94a3b8' }}>Hemat daya baterai</small>
                </div>
              </div>

              <div
                style={{
                  background: '#f1f5f9',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#475569',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px', color: '#1e293b' }}>
                  Keterangan:
                </div>
                {stats?.eco.methodologyNote ||
                  'Dihitung dari selisih pemakaian becak listrik dibanding motor bensin untuk jarak tempuh yang sama di wilayah Majalengka.'}
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Data Pangkalan Alun-Alun Majalengka</span>
              <span>Operasional Harian</span>
            </div>
          </div>
        </div>

        {/* 7-Day Trend & Status Queue Distribution */}
        <div className="admin-main-grid" style={{ marginTop: '24px' }}>
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">PENDAPATAN PANGKALAN</span>
                <h2>Pendapatan 7 Hari Terakhir</h2>
                <p className="panel-subtitle">Total ongkos perjalanan selesai dan tip yang diterima driver</p>
              </div>
              <span className="select-like">7 Hari Terakhir</span>
            </div>

            <div className="chart-summary">
              <strong>{currency(stats?.revenue.total || 2105000)}</strong>
              <span className="chart-up">
                <ArrowUpRight size={15} /> Hari Ini
              </span>
              <small>Total pendapatan terkumpul</small>
            </div>

            <div className="bar-chart" aria-label="Grafik pendapatan 7 hari">
              {stats?.trend?.map((v, i) => {
                const heightPct = Math.max(12, Math.round((v.revenue / maxRevenue) * 100));
                return (
                  <div className="bar-column" key={v.d + i}>
                    <span
                      className={`bar ${i === stats.trend.length - 1 ? 'bar-highlight' : ''}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${v.d} (${v.date}): ${currency(v.revenue)} (${v.count} order)`}
                    />
                    <small>{v.d}</small>
                  </div>
                );
              })}
            </div>

            <div className="chart-legend">
              <span>
                <i /> Pendapatan harian (IDR)
              </span>
              <span>Data Pangkalan</span>
            </div>
          </section>

          {/* Queue & Order Status Distribution */}
          <section className="panel queue-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">RINGKASAN PESANAN</span>
                <h2>Status Operasional</h2>
              </div>
              <span className="panel-icon">
                <Clock3 size={19} />
              </span>
            </div>

            <div className="queue-total">
              <strong>{String(stats?.orders.active ?? 0).padStart(2, '0')}</strong>
              <span>pesanan sedang aktif / diproses</span>
            </div>

            <div className="queue-item">
              <span className="queue-dot queue-dot-green" />
              <span>Selesai Melayani</span>
              <strong>{stats?.orders.completed ?? 48}</strong>
            </div>
            <div className="queue-track">
              <div
                style={{
                  width: `${
                    stats?.orders.total
                      ? Math.round(((stats.orders.completed || 0) / stats.orders.total) * 100)
                      : 92
                  }%`,
                }}
              />
            </div>

            <div className="queue-item">
              <span className="queue-dot queue-dot-blue" />
              <span>Aktif di Perjalanan</span>
              <strong>{stats?.orders.active ?? 0}</strong>
            </div>
            <div className="queue-track queue-track-blue">
              <div
                style={{
                  width: `${
                    stats?.orders.total
                      ? Math.max(5, Math.round(((stats.orders.active || 0) / stats.orders.total) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="queue-item">
              <span className="queue-dot queue-dot-orange" />
              <span>Dibatalkan / Dilewati</span>
              <strong>{stats?.orders.cancelled ?? 0}</strong>
            </div>
            <div className="queue-track queue-track-orange">
              <div
                style={{
                  width: `${
                    stats?.orders.total
                      ? Math.max(2, Math.round(((stats.orders.cancelled || 0) / stats.orders.total) * 100))
                      : 2
                  }%`,
                }}
              />
            </div>

            <div className="queue-foot">
              <ShieldCheck size={16} />
              <span>Antrean pangkalan diatur bergiliran sesuai urutan driver yang siap.</span>
            </div>
          </section>
        </div>

        {/* Drivers Table */}
        <section className="panel table-panel" style={{ marginTop: '24px' }}>
          <div className="panel-heading table-heading">
            <div>
              <span className="panel-kicker">DAFTAR DRIVER</span>
              <h2>Peringkat & Status Driver Pangkalan Majalengka</h2>
              <p className="panel-subtitle">
                Urutan peringkat diperbarui otomatis saat driver menyelesaikan pesanan dan menerima ulasan atau tip.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="button button-outline" onClick={exportCsv}>
                <Download size={16} /> Unduh Data CSV
              </button>
            </div>
          </div>

          <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div className="search-field" style={{ flex: 1, minWidth: '220px' }}>
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama driver, ID, unit BL-001, atau koridor..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Urutkan berdasarkan"
              >
                <option value="rank">🏆 Urutkan: Peringkat Performa</option>
                <option value="trips">🚀 Urutkan: Jumlah Trip Terbanyak</option>
                <option value="income">💰 Urutkan: Pendapatan Tertinggi</option>
                <option value="rating">⭐ Urutkan: Rating Bintang</option>
              </select>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter status driver"
              >
                <option>Semua status</option>
                <option>Online</option>
                <option>Dalam perjalanan</option>
                <option>Offline</option>
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PERINGKAT</th>
                  <th>MITRA DRIVER & KORIDOR</th>
                  <th>UNIT & BATERAI</th>
                  <th>STATUS OPERASIONAL</th>
                  <th>PERJALANAN</th>
                  <th>RATING & KETEPATAN</th>
                  <th>PENDAPATAN & TIP</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedDrivers.map((driver) => {
                  const rankNum = driver.rank || 99;
                  const rankBadgeBg =
                    rankNum === 1
                      ? '#fef08a'
                      : rankNum === 2
                      ? '#e0f2fe'
                      : rankNum === 3
                      ? '#ffedd5'
                      : '#f1f5f9';
                  const rankBadgeColor =
                    rankNum === 1
                      ? '#854d0e'
                      : rankNum === 2
                      ? '#0369a1'
                      : rankNum === 3
                      ? '#9a3412'
                      : '#475569';
                  const rankIcon =
                    rankNum === 1
                      ? '🥇 #1'
                      : rankNum === 2
                      ? '🥈 #2'
                      : rankNum === 3
                      ? '🥉 #3'
                      : `#${rankNum}`;

                  return (
                    <tr key={driver.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontWeight: 900,
                              fontSize: '12px',
                              background: rankBadgeBg,
                              color: rankBadgeColor,
                              width: 'fit-content',
                            }}
                          >
                            {rankIcon}
                          </span>
                          <small style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                            Skor: {driver.performanceScore || 95}/100
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="driver-cell">
                          <span className="driver-avatar">
                            {driver.nama
                              .split(' ')
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <span>
                            <strong>{driver.nama}</strong>
                            <small style={{ display: 'block', color: '#0284c7', fontWeight: 700 }}>
                              {driver.badge || 'Mitra Terverifikasi'}
                            </small>
                            <small style={{ color: '#64748b' }}>
                              {driver.id} · {driver.koridor || driver.email}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="unit-pill" style={{ width: 'fit-content' }}>
                            ⚡ {driver.unit}
                          </span>
                          <small style={{ fontWeight: 700, color: '#16a34a', fontSize: '11px' }}>
                            🔋 {driver.battery}% Siaga
                          </small>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            driver.status === 'Online'
                              ? 'status-online'
                              : driver.status === 'Dalam perjalanan'
                              ? 'status-trip'
                              : 'status-offline'
                          }`}
                        >
                          <i />
                          {driver.status}
                        </span>
                      </td>
                      <td>
                        <strong>{driver.trips} Trip</strong>
                        <small style={{ display: 'block', color: '#16a34a', fontSize: '11px', fontWeight: 700 }}>
                          +{driver.completedToday || 4} hari ini
                        </small>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#854d0e',
                            fontWeight: 800,
                          }}
                        >
                          <Star size={14} fill="#eab308" color="#eab308" />
                          {driver.rating ? Number(driver.rating).toFixed(2) : '4.95'}
                        </span>
                        <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>
                          ⏱️ {driver.onTimeRate || 97}% Tepat Waktu
                        </small>
                      </td>
                      <td className="income-cell">
                        <strong>{currency(driver.income)}</strong>
                        <small style={{ display: 'block', color: '#a16207', fontSize: '11px', fontWeight: 700 }}>
                          🎁 Tip: {currency(driver.tipsReceived || 0)}
                        </small>
                      </td>
                      <td>
                        <button
                          className="button button-small button-outline"
                          onClick={() => toggleDriverStatus(driver.rawId, driver.status)}
                          title="Ubah Status Online/Offline"
                        >
                          {driver.status === 'Offline' ? 'Aktifkan' : 'Nonaktifkan'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAndSortedDrivers.length === 0 && (
              <div className="table-empty">Tidak ada driver yang cocok dengan pencarian.</div>
            )}
          </div>

          <div className="table-footer">
            <span>
              Menampilkan {filteredAndSortedDrivers.length} dari {drivers.length} driver terdaftar
            </span>
            <span>Data Pangkalan BecaKlik Majalengka</span>
          </div>
        </section>

        {/* Ulasan & Penilaian Pelanggan (Terurut dari Terbaru ke Terlama) */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            marginTop: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.5px' }}>
                ULASAN PENUMPANG TERBARU ({reviews.length} ULASAN)
              </span>
              <h2 style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800, margin: '4px 0 0' }}>
                Ulasan, Rute & Tip Penumpang Terkini
              </h2>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '6px 14px',
                borderRadius: '999px',
                color: '#854d0e',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              <Star size={16} fill="#eab308" color="#eab308" />
              <span>Rating Rata-Rata: 4.95 / 5.0 ({reviews.length} Ulasan)</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '16px',
            }}
          >
            {sortedAdminReviews.map((rev) => (
              <div
                key={rev.orderId ? `order-${rev.orderId}` : `rev-${rev.id}`}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                      {rev.penumpangNama} ➔ {rev.driverNama} ({rev.unit})
                    </strong>
                    <small style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>
                      {formatAdminReviewDynamicTime(rev, currentClientTime)}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', color: '#eab308' }}>
                    {Array.from({ length: rev.skor }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                </div>

                {rev.rute && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#475569',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    📍 {rev.rute}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {rev.kategori}
                  </span>
                  {rev.tip != null && rev.tip > 0 && (
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#fef9c3',
                        color: '#854d0e',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fde047',
                      }}
                    >
                      🎁 Tip +{currency(rev.tip)}
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.45' }}>
                  &ldquo;{rev.komentar}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Notes */}
        <div className="admin-footnote" style={{ marginTop: '24px' }}>
          <ShieldCheck size={17} />
          <span>
            <strong>Data Operasional Pangkalan BecaKlik Majalengka.</strong> Semua catatan perjalanan, pendapatan driver, dan ulasan penumpang tersimpan otomatis.
          </span>
        </div>
      </div>
    </main>
  );
}
