"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CircleDollarSign,
  Clock3,
  MapPin,
  Power,
  ShieldCheck,
  BatteryCharging,
  Route,
  ArrowRight,
  Radar,
  Star,
  BellRing,
  X,
  Zap,
  Volume2,
  Award,
  Target,
  CheckCircle2,
  MessageSquare,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";
import MapWrapper from "@/components/map/MapWrapper";
import TripChat from "@/components/chat/TripChat";
import {
  generateRoadCorridorFallback,
  generatePickupApproachRoute,
  interpolateRoutePosition,
} from "@/lib/geo";

const currency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

// Web Audio API polite alert sound for incoming order
function playOrderChime() {
  try {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("becak_sound_enabled") === "false"
    ) {
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    // Harmonic chime melody: D5 -> A5 -> D6
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    osc.frequency.setValueAtTime(1174.66, now + 0.24);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.6);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 700);
  } catch {
    // User interaction audio policy
  }
}

interface DriverData {
  id: number;
  nama: string;
  email: string;
  unit: string;
  batteryPct: number;
  status: "ONLINE" | "OFFLINE" | "ON_TRIP";
  ratingAverage?: number;
  totalTrips?: number;
  rank?: number;
  totalDrivers?: number;
  performanceScore?: number;
  badge?: string;
  tipsReceived?: number;
}

interface OrderInfo {
  id: number;
  kode: string;
  jemputAlamat: string;
  jemputLat?: number;
  jemputLng?: number;
  tujuanAlamat: string;
  tujuanLat?: number;
  tujuanLng?: number;
  jarakKm: number;
  tarif: number;
  diskon?: number;
  totalBayar?: number;
  tip?: number;
  serviceType?: "REGULER" | "KARGO" | "WISATA";
  passengerCount?: number;
  catatan?: string;
  metodePembayaran?: "QRIS" | "CASH" | "TUNAI" | "SALDO";
  status: string;
  simulationProgress: number;
  routeGeometry?: string;
  penumpangNama?: string;
  penumpang?: { nama: string; noHp?: string };
  driver?: {
    id: number;
    currentLat: number;
    currentLng: number;
    heading: number;
  };
}

interface ReviewInfo {
  id: number;
  penumpangNama: string;
  skor: number;
  kategori: string;
  komentar: string;
  tip?: number;
  rute?: string;
  createdAt: string;
  timestamp?: number;
}

function formatReviewDynamicTime(rev: ReviewInfo, now: number = Date.now()): string {
  let ts = typeof rev.timestamp === "number" && rev.timestamp > 1700000000000 ? rev.timestamp : 0;

  if (rev.id === 1001) {
    ts = Date.UTC(2026, 10, 7, 9, 37, 0); // 7 Nov 2026, 16:37 WIB (Kemarin)
  }

  if (!ts) {
    const raw = (rev.createdAt || "").toLowerCase();
    if (raw.includes("menit lalu")) {
      const m = raw.match(/(\d+)\s*menit/);
      if (m) ts = now - parseInt(m[1], 10) * 60000;
    } else if (raw.includes("jam lalu")) {
      const h = raw.match(/(\d+)\s*jam/);
      if (h) ts = now - parseInt(h[1], 10) * 3600000;
    } else if (raw.includes("baru saja")) {
      ts = now;
    }
  }

  if (!ts) return rev.createdAt || "Baru saja";

  const diffMs = Math.max(0, now - ts);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

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

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${rDate} ${months[rMonth]} ${rYear}, ${timeStr}`;
}

export default function DriverPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverData | null>({
    id: 1,
    nama: "Budi Santoso",
    email: "budi@becak.test",
    unit: "BL-001",
    batteryPct: 94,
    status: "ONLINE",
    ratingAverage: 4.95,
    totalTrips: 48,
    rank: 1,
    totalDrivers: 6,
    performanceScore: 98.5,
    badge: "🏆 Peringkat 1 · Driver Terbaik",
    tipsReceived: 31000,
  });
  const [driverTab, setDriverTab] = useState<"nav" | "chat">("nav");
  const [autoSimDriver, setAutoSimDriver] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("becak_driver_online_status");
      if (saved === "ONLINE" || saved === "OFFLINE") {
        const timer = setTimeout(() => {
          setDriver((prev) => (prev ? { ...prev, status: saved } : prev));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Sinkronkan riwayat perjalanan dari localStorage browser penumpang agar pesanan kemarin langsung muncul
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedHistory = localStorage.getItem("becak_passenger_trip_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          void fetch("/api/driver/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "SYNC_HISTORY", trips: parsed }),
          }).catch(() => {});
        }
      }
    } catch {
      // ignore parse error
    }
  }, []);

  const [activeOrder, setActiveOrder] = useState<OrderInfo | null>(null);
  const [incomingOrders, setIncomingOrders] = useState<OrderInfo[]>([]);
  const [reviews, setReviews] = useState<ReviewInfo[]>([
    {
      id: 1001,
      penumpangNama: "Edrick Andreas",
      skor: 5,
      kategori: "Rute Cepat & Aman",
      komentar: "makasihh pakkkkkk",
      tip: 20000,
      rute: "Universitas Majalengka (Kampus UNMA) ➔ RSUD Cideres Majalengka",
      createdAt: "Kemarin, 16:37",
    },
    {
      id: 991,
      penumpangNama: "Rina Kusuma",
      skor: 5,
      kategori: "Tepat Waktu & Hening",
      komentar:
        "Becaknya bersih dan tidak bising. Sangat nyaman untuk keliling kota!",
      tip: 2000,
      rute: "Alun-Alun Majalengka ➔ Pasar Mambo Sentra Kuliner",
      createdAt: "5 hari lalu, 14:20",
    },
    {
      id: 990,
      penumpangNama: "Rina Kusuma",
      skor: 5,
      kategori: "Driver Ramah",
      komentar:
        "Pak Budi ramah sekali, menjelaskan sejarah Majalengka di jalan.",
      tip: 5000,
      rute: "Bunderan Munjul ➔ Gedung Juang Majalengka",
      createdAt: "6 hari lalu, 09:45",
    },
    {
      id: 989,
      penumpangNama: "Ahmad Fauzi",
      skor: 5,
      kategori: "Tepat Waktu & Hening",
      komentar:
        "Becak listriknya sangat nyaman dan bersih, tidak bising sama sekali saat menuju kampus!",
      tip: 3000,
      rute: "Jl. Siti Armilah ➔ Universitas Majalengka (UNMA)",
      createdAt: "1 Nov 2026, 15:35",
    },
    {
      id: 988,
      penumpangNama: "Hj. Siti Rahmawati",
      skor: 5,
      kategori: "Driver Ramah & Sabar",
      komentar:
        "Pak Budi sangat membantu membawakan belanjaan pasar saya sampai depan teras rumah.",
      tip: 5000,
      rute: "Pasar Sindangkasih Cigasong ➔ Perum Wijaya Kusuma Cijati",
      createdAt: "1 jam lalu",
    },
    {
      id: 987,
      penumpangNama: "Dr. Hendra Pratama",
      skor: 5,
      kategori: "Kabin Bersih & Nyaman",
      komentar:
        "Suspensi empuk dan bebas asap knalpot, sangat cocok untuk pasien lansia ke RSUD.",
      tip: 5000,
      rute: "Pemukiman Babakan Jawa ➔ RSUD Majalengka",
      createdAt: "2 jam lalu",
    },
    {
      id: 986,
      penumpangNama: "Neng Dinda Permata",
      skor: 5,
      kategori: "Tarif Jujur & Transparan",
      komentar:
        "Bayar pakai QRIS praktis banget, tarifnya pas sesuai aplikasi tanpa tawar-menawar.",
      tip: 2000,
      rute: "SMAN 1 Majalengka ➔ Surya Toserba Majalengka",
      createdAt: "3 jam lalu",
    },
  ]);
  const [stats, setStats] = useState({
    completedToday: 6,
    earningsToday: 78000,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [currentClientTime, setCurrentClientTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClientTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const [acceptNotification, setAcceptNotification] = useState<string>("");
  const [dismissedModalIds, setDismissedModalIds] = useState<number[]>([]);
  const prevIncomingCountRef = useRef(0);
  const prevTipRef = useRef(0);
  const dismissedOrderIdRef = useRef<number | null>(null);
  const rejectedOrderIdsRef = useRef<Set<number>>(new Set());
  const chimedOrderIdsRef = useRef<Set<number>>(new Set());

  // Auto-dismiss accept notification after 7 seconds
  useEffect(() => {
    if (!acceptNotification) return;
    const timer = setTimeout(() => setAcceptNotification(""), 7000);
    return () => clearTimeout(timer);
  }, [acceptNotification]);

  // Load Driver status and active trip
  const loadDriverData = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/active");
      const data = await res.json();
      if (data.driver) {
        const rawActive =
          data.activeOrder &&
          (data.activeOrder.id === dismissedOrderIdRef.current ||
            data.activeOrder.status === "DIBATALKAN")
            ? null
            : data.activeOrder;
        const localSaved =
          typeof window !== "undefined"
            ? localStorage.getItem("becak_driver_online_status")
            : null;
        const effectiveStatus = (
          rawActive ? "ON_TRIP" : localSaved || data.driver.status || "ONLINE"
        ) as DriverData["status"];
        setDriver({ ...data.driver, status: effectiveStatus });
        setActiveOrder(rawActive);
        const filteredInc = (data.incomingOrders || []).filter(
          (o: OrderInfo) => !rejectedOrderIdsRef.current.has(o.id),
        );
        setIncomingOrders(filteredInc);
        if (data.stats) setStats(data.stats);
        if (data.recentReviews && data.recentReviews.length > 0) {
          setReviews(data.recentReviews);
        }
      }
    } catch (e) {
      console.error("Error fetching driver active data:", e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDriver = async () => {
      try {
        const res = await fetch("/api/driver/active");
        const data = await res.json();
        if (!active) return;
        if (data.driver) {
          const rawActive =
            data.activeOrder &&
            (data.activeOrder.id === dismissedOrderIdRef.current ||
              data.activeOrder.status === "DIBATALKAN")
              ? null
              : data.activeOrder;
          const localSaved =
            typeof window !== "undefined"
              ? localStorage.getItem("becak_driver_online_status")
              : null;
          const effectiveStatus = (
            rawActive ? "ON_TRIP" : localSaved || data.driver.status || "ONLINE"
          ) as DriverData["status"];

          const filteredInc: OrderInfo[] = (data.incomingOrders || []).filter(
            (o: OrderInfo) => !rejectedOrderIdsRef.current.has(o.id),
          );

          // Play sound strictly once per new order ID to prevent repetitive loops
          const unnotified = filteredInc.filter(
            (o) =>
              !chimedOrderIdsRef.current.has(o.id) &&
              o.id !== rawActive?.id &&
              o.status === "MENCARI_DRIVER",
          );
          if (unnotified.length > 0 && effectiveStatus === "ONLINE") {
            unnotified.forEach((o) => chimedOrderIdsRef.current.add(o.id));
            playOrderChime();
          }
          prevIncomingCountRef.current = filteredInc.length;

          // Sound and alert when passenger sends tip in real time
          const currentTip = rawActive?.tip || 0;
          if (currentTip > (prevTipRef.current || 0)) {
            playOrderChime();
            setAcceptNotification(
              `🎁 TIP DITERIMA! Penumpang ${rawActive.penumpangNama || "Rina Kusuma"} memberikan tip sebesar ${currency(currentTip)}.`,
            );
          }
          prevTipRef.current = currentTip;

          // Guard driver state untuk menghindari re-render berlebih
          setDriver((prev) => {
            if (!prev) return { ...data.driver, status: effectiveStatus };
            const d = data.driver;
            if (
              prev.id === d.id &&
              prev.status === effectiveStatus &&
              prev.batteryPct === d.batteryPct &&
              prev.unit === d.unit &&
              prev.nama === d.nama &&
              prev.totalTrips === d.totalTrips &&
              prev.ratingAverage === d.ratingAverage &&
              prev.rank === d.rank
            ) {
              return prev;
            }
            return { ...prev, ...d, status: effectiveStatus };
          });

          // Guard activeOrder state (Never allow progress or status to jump backwards)
          setActiveOrder((prev) => {
            if (!prev && !rawActive) return null;
            if (!prev && rawActive) return rawActive;
            if (prev && !rawActive) return null;
            const o = rawActive;
            if (prev!.id !== o.id) return o;

            const safeProg = Math.max(
              prev!.simulationProgress || 0,
              o.simulationProgress || 0,
            );

            const statusRank = ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN', 'SELESAI'];
            const prevIdx = statusRank.indexOf(prev!.status);
            const incomingIdx = statusRank.indexOf(o.status);
            const safeStatus = (prevIdx > incomingIdx ? prev!.status : o.status) as OrderInfo['status'];

            if (
              prev!.id === o.id &&
              prev!.status === safeStatus &&
              prev!.simulationProgress === safeProg &&
              prev!.tip === o.tip &&
              prev!.driver?.currentLat === o.driver?.currentLat &&
              prev!.driver?.currentLng === o.driver?.currentLng &&
              prev!.driver?.heading === o.driver?.heading
            ) {
              return prev;
            }
            return {
              ...o,
              status: safeStatus,
              simulationProgress: safeProg,
              driver: {
                ...o.driver,
                currentLat: prevIdx > incomingIdx && prev!.driver ? prev!.driver.currentLat : o.driver.currentLat,
                currentLng: prevIdx > incomingIdx && prev!.driver ? prev!.driver.currentLng : o.driver.currentLng,
                heading: prevIdx > incomingIdx && prev!.driver ? prev!.driver.heading : o.driver.heading,
              },
            };
          });

          // Guard incomingOrders state
          setIncomingOrders((prev) => {
            if (prev.length === filteredInc.length) {
              const isSame = prev.every(
                (p, idx) =>
                  p.id === filteredInc[idx]?.id &&
                  p.status === filteredInc[idx]?.status,
              );
              if (isSame) return prev;
            }
            return filteredInc;
          });

          if (data.stats) {
            setStats((prev) => {
              if (
                prev &&
                prev.completedToday === data.stats.completedToday &&
                prev.earningsToday === data.stats.earningsToday
              ) {
                return prev;
              }
              return data.stats;
            });
          }
          if (data.recentReviews && data.recentReviews.length > 0) {
            setReviews(data.recentReviews);
          }
        }
      } catch (e) {
        console.error("Error fetching driver active data:", e);
      }
    };

    void fetchDriver();
    // Polling 2.5s agar sinkron stabil tanpa osilasi bolak-balik antar container
    const interval = setInterval(() => {
      if (active) void fetchDriver();
    }, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // INSTANT & PERSISTENT ONLINE/OFFLINE TOGGLE
  async function handleToggleOnline() {
    if (!driver) return;

    const nextStatus = driver.status === "ONLINE" ? "OFFLINE" : "ONLINE";
    setDriver((prev) => (prev ? { ...prev, status: nextStatus } : null));

    if (typeof window !== "undefined") {
      localStorage.setItem("becak_driver_online_status", nextStatus);
    }

    try {
      await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "SET_STATUS",
          status: nextStatus,
        }),
      });
    } catch (e) {
      console.warn("Background sync driver status notice:", e);
    }
  }

  // Accept incoming order
  async function handleAcceptOrder(orderId: number) {
    if (!driver) return;
    setActionLoading(true);
    const orderToAccept = incomingOrders.find((o) => o.id === orderId) || activeOrder;
    try {
      const res = await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "ACCEPT_ORDER",
          orderId,
          orderData: orderToAccept,
        }),
      });
      const data = await res.json().catch(() => null);
      let acceptedOrder = data?.order;
      if (!acceptedOrder && orderToAccept) {
        // Fallback local accept: guarantees order is NEVER stuck on Vercel stateless containers
        acceptedOrder = {
          ...orderToAccept,
          status: "DITERIMA",
          driverId: driver.id,
          simulationProgress: 5,
          driver: {
            id: driver.id,
            currentLat: orderToAccept.jemputLat,
            currentLng: orderToAccept.jemputLng,
            heading: 0,
            ratingAverage: driver.ratingAverage || 4.95,
            totalTrips: driver.totalTrips || 63,
            user: { id: driver.id || 1, nama: driver.nama, noHp: "081234560001" },
            vehicle: {
              kodeUnit: driver.unit,
              modelName: "Becak Listrik Majalengka EV",
              warna: "Biru Langit",
              kapasitas: 2,
              batteryPct: driver.batteryPct,
            },
          },
        };
      }
      if (acceptedOrder) {
        playOrderChime();
        setActiveOrder(acceptedOrder);
        chimedOrderIdsRef.current.add(orderId);
        setIncomingOrders((prev) => prev.filter((o) => o.id !== orderId));
        setDismissedModalIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
        setAcceptNotification(
          `✓ Order ${acceptedOrder.kode} Berhasil Diambil! Segera meluncur ke ${acceptedOrder.jemputAlamat} untuk menjemput ${acceptedOrder.penumpangNama || "penumpang"}.`,
        );

        // Broadcast langsung ke tab Penumpang
        try {
          const bc = new BroadcastChannel("becaklik_order_sync");
          bc.postMessage({
            type: "ORDER_ACCEPTED",
            orderId,
            order: acceptedOrder,
          });
          bc.close();
        } catch {}
      }
      await loadDriverData();
    } catch (e) {
      console.error("Error accepting order:", e);
    } finally {
      setActionLoading(false);
    }
  }

  // Tolak / Lewati Order Masuk
  async function handleRejectOrder(orderId: number) {
    if (!driver) return;
    rejectedOrderIdsRef.current.add(orderId);
    chimedOrderIdsRef.current.add(orderId);
    setIncomingOrders((prev) => prev.filter((o) => o.id !== orderId));
    setDismissedModalIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
    setAcceptNotification("Pesanan berhasil dilewati.");
    try {
      await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "REJECT_ORDER",
          orderId,
        }),
      });
    } catch {}
  }

  // Simulasi Pesanan Masuk (Memudahkan juri menguji dari 1 tab driver)
  async function handleSimulateIncomingOrder() {
    if (!driver) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "SIMULATE_INCOMING_ORDER",
        }),
      });
      const data = await res.json().catch(() => null);
      playOrderChime();
      if (data?.order) {
        setIncomingOrders((prev) => [
          data.order,
          ...prev.filter((o) => o.id !== data.order.id),
        ]);
        setAcceptNotification(
          '⚡ Pesanan simulasi baru masuk! Klik "Terima Pesanan" di atas.',
        );
      }
      await loadDriverData();
    } catch (e) {
      console.error("Error simulating incoming order:", e);
    } finally {
      setActionLoading(false);
    }
  }

  // Advance Trip Status (+25% fast-forward)
  async function handleAdvanceOrder() {
    if (!driver || !activeOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "ADVANCE_ORDER",
          orderId: activeOrder.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.order) {
        setActiveOrder(data.order);
      } else {
        await loadDriverData();
      }
    } catch (e) {
      console.error("Error advancing order:", e);
    } finally {
      setActionLoading(false);
    }
  }

  // Instant Finish Trip (100% SELESAI)
  async function handleInstantFinishDriver() {
    if (!activeOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINISH" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.order) {
        setActiveOrder(data.order);
      } else {
        await loadDriverData();
      }
    } catch (e) {
      console.error("Error finishing order:", e);
    } finally {
      setActionLoading(false);
    }
  }

  // Automatic Real-Time Simulation Sync on Driver Page (Tidak perlu klik manual terus-menerus)
  const activeOrdId = activeOrder?.id;
  const activeOrdStatus = activeOrder?.status;
  useEffect(() => {
    if (
      !activeOrdId ||
      !autoSimDriver ||
      activeOrdStatus === "MENCARI_DRIVER" ||
      activeOrdStatus === "SELESAI" ||
      activeOrdStatus === "DIBATALKAN"
    ) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/simulation/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: activeOrdId,
            deltaPercent: 2,
            currentProgress: activeOrder?.simulationProgress || 5,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.order) {
          setActiveOrder((prev) => {
            if (!prev || prev.id !== data.order.id) return prev;
            if (prev.status === "SELESAI") return prev;
            const safeProg = Math.max(
              prev.simulationProgress || 0,
              data.order.simulationProgress || 0,
            );
            const statusRank = ['MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN', 'SELESAI'];
            const prevIdx = statusRank.indexOf(prev.status);
            const incomingIdx = statusRank.indexOf(data.order.status);
            const safeStatus = (prevIdx > incomingIdx ? prev.status : data.order.status) as OrderInfo['status'];

            return {
              ...prev,
              ...data.order,
              status: safeStatus,
              simulationProgress: safeProg,
            };
          });

          // Broadcast realtime ke tab Pelanggan
          try {
            const bc = new BroadcastChannel("becaklik_simulation_sync");
            bc.postMessage({
              type: "SIM_PROGRESS",
              orderId: activeOrdId,
              progress: data.order.simulationProgress,
              status: data.order.status,
            });
            bc.close();
          } catch {}
        }
      } catch {
        // background step
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeOrdId, activeOrdStatus, autoSimDriver]);

  // Sinkronisasi Lintas-Tab Driver <-> Penumpang (Zero Latency Lockstep)
  useEffect(() => {
    if (typeof window === "undefined" || !activeOrdId) return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("becaklik_simulation_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "SIM_PROGRESS" && event.data.orderId === activeOrdId) {
          const incomingProg = Number(event.data.progress || 0);
          setActiveOrder((prev) => {
            if (!prev || prev.id !== activeOrdId) return prev;
            if (prev.status === "SELESAI") return prev;
            const safeProg = Math.max(prev.simulationProgress || 0, incomingProg);
            const newStatus = event.data.status || (safeProg >= 100 ? "SELESAI" : prev.status);
            return {
              ...prev,
              simulationProgress: safeProg,
              status: newStatus,
            };
          });
        }
      };
    } catch {}

    return () => {
      if (bc) bc.close();
    };
  }, [activeOrdId]);

  // Sinkronisasi Order Masuk Lintas-Tab dari Penumpang (Instant Notification)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("becaklik_order_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "NEW_ORDER" && event.data.order) {
          const incoming: OrderInfo = event.data.order;
          setIncomingOrders((prev) => {
            if (prev.some((o) => o.id === incoming.id)) return prev;
            playOrderChime();
            return [incoming, ...prev];
          });
        }
      };
    } catch {}

    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Dismiss Completed Trip and Return to Standby Queue (Instant & Race-Condition Safe)
  async function handleDismissOrder() {
    if (!driver || !activeOrder) return;
    const finishedOrderId = activeOrder.id;
    dismissedOrderIdRef.current = finishedOrderId;
    setActiveOrder(null);
    setDriverTab("nav");
    prevTipRef.current = 0;
    setDriver((prev) => (prev ? { ...prev, status: "ONLINE" } : null));
    setAcceptNotification(
      "✓ Data perjalanan berhasil disimpan! Armada kembali siap menerima pesanan di Pangkalan Alun-Alun.",
    );

    try {
      await fetch("/api/driver/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          action: "DISMISS_ORDER",
          orderId: finishedOrderId,
        }),
      });
    } catch (e) {
      console.error("Error dismissing order:", e);
    }
  }

  // Parse Route coordinates for driver's map
  let routeCoords: [number, number][] = [];
  if (activeOrder?.routeGeometry) {
    try {
      routeCoords = JSON.parse(activeOrder.routeGeometry);
    } catch {
      // fallback
    }
  }

  // Fallback koridor jalan realistis Majalengka jika belum ter-generate
  if (
    routeCoords.length === 0 &&
    activeOrder?.jemputLat != null &&
    activeOrder?.jemputLng != null &&
    activeOrder?.tujuanLat != null &&
    activeOrder?.tujuanLng != null
  ) {
    routeCoords = generateRoadCorridorFallback(
      activeOrder.jemputLat,
      activeOrder.jemputLng,
      activeOrder.tujuanLat,
      activeOrder.tujuanLng,
    );
  }

  // Real-time Driver GPS position for driver's map
  let driverMapPos: [number, number] = [-6.8362, 108.2281];
  let driverMapHeading = 45;

  if (routeCoords.length > 0 && activeOrder) {
    const prog = activeOrder.simulationProgress || 0;
    if (prog >= 100) {
      driverMapPos = routeCoords[routeCoords.length - 1];
      driverMapHeading = 0;
    } else if (prog < 20) {
      const approachRoute = generatePickupApproachRoute(
        activeOrder.jemputLat ?? -6.8362,
        activeOrder.jemputLng ?? 108.2281,
        routeCoords[1] || routeCoords[0]
      );
      const subProg = Math.min(100, Math.max(0, (prog / 20) * 100));
      const interp = interpolateRoutePosition(approachRoute, subProg);
      driverMapPos = interp.position;
      driverMapHeading = interp.heading;
    } else {
      const tripProg = Math.min(100, Math.max(0, ((prog - 20) / 80) * 100));
      const interp = interpolateRoutePosition(routeCoords, tripProg);
      driverMapPos = interp.position;
      driverMapHeading = interp.heading;
    }
  } else if (activeOrder?.driver?.currentLat && activeOrder?.driver?.currentLng) {
    driverMapPos = [
      activeOrder.driver.currentLat,
      activeOrder.driver.currentLng,
    ];
    driverMapHeading = activeOrder.driver.heading ?? 45;
  } else if (activeOrder?.jemputLat && activeOrder?.jemputLng) {
    driverMapPos = [activeOrder.jemputLat, activeOrder.jemputLng];
  }

  // Pastikan nama driver aman dan tidak tertimpa nama penumpang
  const isPassengerName =
    activeOrder?.penumpangNama && driver?.nama === activeOrder.penumpangNama;
  const driverDisplayName =
    driver?.nama &&
    !isPassengerName &&
    driver.nama !== "Rina Kusuma" &&
    driver.nama !== "Ahmad Fauzi"
      ? driver.nama
      : "Budi Santoso";

  const isOnline = driver?.status === "ONLINE" || driver?.status === "ON_TRIP";
  const incomingAlertOrder = incomingOrders.find(
    (o) =>
      !dismissedModalIds.includes(o.id) &&
      o.id !== activeOrder?.id &&
      o.status === "MENCARI_DRIVER",
  );

  // Handle Driver Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // offline
    }
    router.replace("/login?role=driver");
  };

  // Target Harian Calculation
  const dailyTarget = 10;
  const currentTrips = stats.completedToday;
  const targetPercent = Math.min(
    100,
    Math.round((currentTrips / dailyTarget) * 100),
  );

  return (
    <main className="app-page dashboard-page">
      <div className="container">
        {/* Cockpit Top Bar */}
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">
              HALAMAN DRIVER · PANGKALAN MAJALENGKA
            </span>
            <h1>
              Selamat bertugas, <span>{driverDisplayName}.</span>
            </h1>
            <p>
              Becak Listrik Unit {driver?.unit || "BL-001"} · Pangkalan Kota
              Majalengka.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="button button-outline"
              style={{ fontSize: "12px", padding: "10px 14px" }}
              title="Keluar dari sesi mitra driver"
            >
              Keluar
            </button>

            {/* Chime Test Button */}
            <button
              type="button"
              onClick={playOrderChime}
              title="Uji Suara Notifikasi Lonceng"
              style={{
                background: "#ffffff",
                border: "1px solid #bae6fd",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Volume2 size={16} /> Tes Notifikasi
            </button>

            {/* Instant Responsive Toggle Switch */}
            <button
              type="button"
              className={`online-toggle ${isOnline ? "is-online" : ""}`}
              onClick={handleToggleOnline}
              style={{
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.15s ease-in-out",
              }}
            >
              <span className="status-dot" />
              {isOnline
                ? "Online · Siap Menerima Order"
                : "Offline · Istirahat"}
              <Power size={16} />
            </button>
          </div>
        </div>

        {/* Prominent Success Alert Banner when order is accepted */}
        {acceptNotification && (
          <div
            className="pop-in-success"
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff",
              padding: "16px 22px",
              borderRadius: "16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(2, 132, 199, 0.35)",
              border: "2px solid #38bdf8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={24} color="#ffffff" />
              </div>
              <div>
                <strong
                  style={{
                    fontSize: "15px",
                    display: "block",
                    letterSpacing: "0.2px",
                  }}
                >
                  PESANAN DITERIMA
                </strong>
                <span style={{ fontSize: "13px", color: "#e0f2fe" }}>
                  {acceptNotification}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAcceptNotification("")}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#ffffff",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Operational Status Pill Banner */}
        <div
          style={{
            background: isOnline ? "#f0f9ff" : "#f8fafc",
            border: `1px solid ${isOnline ? "#bae6fd" : "#cbd5e1"}`,
            borderRadius: "14px",
            padding: "12px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={18} color="#0284c7" />
            <span style={{ fontSize: "13px", color: "#0f172a" }}>
              <strong>Pangkalan Majalengka:</strong> Antrean pangkalan aktif.
              Pesanan masuk diteruskan sesuai urutan driver yang sedang siap.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
            >
              Radius Layanan: 4.2 km
            </span>
          </div>
        </div>

        {/* DAILY TARGET & INCENTIVE TRACKER */}
        <div
          style={{
            background: "linear-gradient(135deg, #075985 0%, #0284c7 100%)",
            color: "#ffffff",
            borderRadius: "18px",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <Target size={18} color="#38bdf8" />
              <strong style={{ fontSize: "14px", letterSpacing: "0.5px" }}>
                TARGET HARIAN MITRA & BONUS INSENTIF
              </strong>
            </div>
            <div style={{ fontSize: "12px", color: "#e0f2fe" }}>
              Selesaikan 10 perjalanan hari ini untuk meraih bonus insentif
              pangkalan sebesar <strong>Rp25.000</strong>.
            </div>

            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                <span>
                  Progres: {currentTrips} / {dailyTarget} Perjalanan
                </span>
                <span>{targetPercent}% Tercapai</span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${targetPercent}%`,
                    background: "#38bdf8",
                    borderRadius: "999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Gamification Badges */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                padding: "8px 12px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <Award
                size={20}
                color="#fde047"
                style={{ margin: "0 auto 2px" }}
              />
              <div style={{ fontSize: "10px", fontWeight: 800 }}>
                MITRA TELADAN
              </div>
              <small style={{ fontSize: "9px", color: "#e0f2fe" }}>
                MAJALENGKA
              </small>
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                padding: "8px 12px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <Zap size={20} color="#38bdf8" style={{ margin: "0 auto 2px" }} />
              <div style={{ fontSize: "10px", fontWeight: 800 }}>NOL EMISI</div>
              <small style={{ fontSize: "9px", color: "#e0f2fe" }}>
                100% Listrik
              </small>
            </div>
          </div>
        </div>

        {/* Driver Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon stat-green">
              <CircleDollarSign />
            </span>
            <span className="stat-label">Pendapatan Bersih Hari Ini</span>
            <strong>{currency(stats.earningsToday)}</strong>
            <small className="stat-positive">Terverifikasi QRIS & Tunai</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-lime">
              <Bike />
            </span>
            <span className="stat-label">Trip Selesai</span>
            <strong>{stats.completedToday} Perjalanan</strong>
            <small>
              Rating Mitra: ★{" "}
              {driver?.ratingAverage ? driver.ratingAverage.toFixed(2) : "4.95"}
            </small>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-blue">
              <Clock3 />
            </span>
            <span className="stat-label">Posisi Antrean Pangkalan</span>
            <strong>
              {activeOrder
                ? "Sedang Bertugas"
                : isOnline
                  ? "Urutan Nomor 1"
                  : "Offline"}
            </strong>
            <small>Pangkalan Alun-Alun</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-purple">
              <BatteryCharging />
            </span>
            <span className="stat-label">Baterai Lithium Unit</span>
            <strong>{driver?.batteryPct || 94}%</strong>
            <small>Tegangan 48V · Normal</small>
          </div>
        </div>

        {/* SECTION PESANAN MASUK - SIAP DIAMBIL MANUAL */}
        {!activeOrder && isOnline && incomingOrders.length > 0 && (
          <div
            className="pop-in-success"
            style={{
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              border: "2px solid #38bdf8",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#0284c7",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 4px 12px rgba(2, 132, 199, 0.35)",
                  }}
                >
                  <BellRing size={20} className="icon-pulse" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Pesanan Masuk · Siap Diambil Manual ({incomingOrders.length}
                    )
                  </h2>
                  <small
                    style={{
                      color: "#0369a1",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Pangkalan Majalengka · Klik tombol di bawah untuk mengambil
                    pesanan secara langsung
                  </small>
                </div>
              </div>
              <span
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  className="pulse-live-dot"
                  style={{ background: "#ffffff" }}
                />
                ANTREAN AKTIF
              </span>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {incomingOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #bae6fd",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#0284c7",
                          background: "#f0f9ff",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        {ord.kode}
                      </span>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {ord.penumpangNama ||
                          ord.penumpang?.nama ||
                          "Rina Kusuma"}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#16a34a",
                          fontWeight: 700,
                        }}
                      >
                        ●{" "}
                        {ord.metodePembayaran === "TUNAI"
                          ? "Bayar Tunai"
                          : "Lunas Terverifikasi"}
                      </span>
                      {ord.serviceType && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#0369a1",
                            background: "#e0f2fe",
                            padding: "2px 7px",
                            borderRadius: "999px",
                          }}
                        >
                          {ord.serviceType}
                          {ord.passengerCount
                            ? ` · ${ord.passengerCount} Org`
                            : ""}
                        </span>
                      )}
                    </div>

                    <div
                      style={{ display: "grid", gap: "4px", fontSize: "13px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#334155",
                        }}
                      >
                        <MapPin size={14} color="#0284c7" />
                        <span>
                          Titik Jemput: <strong>{ord.jemputAlamat}</strong>
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#334155",
                        }}
                      >
                        <Route size={14} color="#ea580c" />
                        <span>
                          Tujuan: <strong>{ord.tujuanAlamat}</strong> (
                          {ord.jarakKm} km)
                        </span>
                      </div>
                      {ord.catatan && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#475569",
                            background: "#f8fafc",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            borderLeft: "3px solid #0284c7",
                            marginTop: "2px",
                          }}
                        >
                          📝 Catatan: <strong>{ord.catatan}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          display: "block",
                        }}
                      >
                        Tarif Bersih
                      </span>
                      <strong
                        style={{
                          fontSize: "18px",
                          color: "#0284c7",
                          fontWeight: 800,
                        }}
                      >
                        {currency(ord.totalBayar ?? ord.tarif)}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => handleRejectOrder(ord.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                          background: "#fef2f2",
                        }}
                      >
                        <X size={15} /> Tolak
                      </button>

                      <button
                        type="button"
                        className="button button-primary shimmer-bar"
                        onClick={() => handleAcceptOrder(ord.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "10px 18px",
                          fontSize: "13px",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
                        }}
                      >
                        <Zap size={15} /> Terima Pesanan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Live Operational Map + Active Trip / Radar Scanner */}
        <div
          className="driver-active-grid"
          style={{
            marginBottom: "32px",
          }}
        >
          {/* Left: Driver Operational & Route Map (Selalu Aktif & Responsif) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              border: "1.5px solid #bae6fd",
              overflow: "hidden",
              boxShadow: "0 8px 30px rgba(2, 132, 199, 0.1)",
              display: "flex",
              flexDirection: "column",
              alignSelf: "start",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#334155",
                  fontWeight: 700,
                }}
              >
                <MapPin size={16} color="#0284c7" />
                <span>
                  {activeOrder
                    ? "Peta Rute Perjalanan"
                    : "Peta Pangkalan Alun-Alun Majalengka"}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#0284c7",
                  fontWeight: 800,
                  background: "#f0f9ff",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid #bae6fd",
                }}
              >
                ● GPS AKTIF
              </span>
            </div>

            <MapWrapper
              center={driverMapPos}
              zoom={15}
              pickupLocation={
                activeOrder
                  ? activeOrder.jemputLat && activeOrder.jemputLng
                    ? [activeOrder.jemputLat, activeOrder.jemputLng]
                    : [-6.8362, 108.2281]
                  : [-6.8362, 108.2281]
              }
              pickupLabel={
                activeOrder
                  ? activeOrder.jemputAlamat
                  : "Pangkalan Utama Alun-Alun Majalengka"
              }
              destinationLocation={
                activeOrder
                  ? activeOrder.tujuanLat && activeOrder.tujuanLng
                    ? [activeOrder.tujuanLat, activeOrder.tujuanLng]
                    : [-6.8295, 108.2198]
                  : null
              }
              destinationLabel={activeOrder?.tujuanAlamat || "Tujuan"}
              routeCoordinates={activeOrder ? routeCoords : []}
              driverLocation={driverMapPos}
              driverHeading={driverMapHeading}
              driverName={driverDisplayName}
              driverUnit={driver?.unit || "BL-001"}
              interactivePick={false}
              zoneRadiusKm={4.2}
              height="470px"
              mode="driver"
            />

            <div
              style={{
                padding: "10px 16px",
                background: "#f0f9ff",
                borderTop: "1px solid #bae6fd",
                fontSize: "12px",
                color: "#0369a1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span>
                {activeOrder ? (
                  <>
                    <strong>Rute Aktif:</strong> {activeOrder.jemputAlamat} ➔{" "}
                    {activeOrder.tujuanAlamat}
                  </>
                ) : (
                  <>
                    <strong>Posisi Standby:</strong> Pangkalan Becak Listrik
                    Alun-Alun Majalengka
                  </>
                )}
              </span>
              <strong style={{ color: "#0284c7" }}>
                {activeOrder
                  ? `${Math.round(activeOrder.simulationProgress)}% Tempuh`
                  : "Unit BL-001 Siaga"}
              </strong>
            </div>
          </div>

          {/* Right: Active Trip Navigation Card or Radar Scanner */}
          {activeOrder ? (
            <>
              {/* Right: Driver Action & Chat Panel */}
              <section
                style={{
                  background: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "22px",
                  boxShadow: "var(--shadow)",
                  alignSelf: "start",
                }}
              >
                {/* View Switcher: Navigasi Trip vs Chat Penumpang */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setDriverTab("nav")}
                    style={{
                      flex: 1,
                      background: driverTab === "nav" ? "#0284c7" : "#f1f5f9",
                      color: driverTab === "nav" ? "#ffffff" : "#475569",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Route size={14} /> Navigasi & Status Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverTab("chat")}
                    style={{
                      flex: 1,
                      background: driverTab === "chat" ? "#0284c7" : "#f0f9ff",
                      color: driverTab === "chat" ? "#ffffff" : "#0284c7",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border:
                        driverTab === "chat" ? "none" : "1px solid #bae6fd",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <MessageSquare size={14} /> Chat Penumpang
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      background: "#f0f9ff",
                      color: "#0284c7",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    PESANAN AKTIF · {activeOrder.kode}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#16a34a",
                      fontWeight: 800,
                    }}
                  >
                    {currency(activeOrder.tarif)}
                  </span>
                </div>

                {driverTab === "chat" ? (
                  <div>
                    <TripChat
                      orderId={activeOrder.id}
                      currentUserRole="DRIVER"
                      currentUserName={`${driverDisplayName} (Driver ${driver?.unit || "BL-001"})`}
                      currentUserId={driver?.id || 2}
                    />
                    <button
                      type="button"
                      onClick={() => setDriverTab("nav")}
                      className="button button-outline button-full"
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        padding: "10px",
                      }}
                    >
                      ← Kembali ke Detail Navigasi Perjalanan
                    </button>
                  </div>
                ) : (
                  <>
                    <h3
                      style={{
                        fontSize: "18px",
                        color: "#0f172a",
                        fontWeight: 800,
                        margin: "0 0 12px",
                      }}
                    >
                      {activeOrder.status === "DITERIMA" &&
                        "Order Diterima! Menuju Titik Jemput"}
                      {activeOrder.status === "DIJEMPUT" &&
                        "Dalam Perjalanan Menuju Penumpang"}
                      {activeOrder.status === "BERJALAN" &&
                        "Mengantar Penumpang ke Lokasi Tujuan"}
                      {activeOrder.status === "SELESAI" &&
                        "Perjalanan Telah Selesai"}
                    </h3>

                    {/* Passenger Info & Chat Action (Tanpa Tombol Telepon) */}
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          Nama Penumpang:
                        </div>
                        <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                          {activeOrder.penumpangNama ||
                            activeOrder.penumpang?.nama ||
                            "Rina Kusuma"}
                        </strong>
                        {(activeOrder.serviceType ||
                          activeOrder.passengerCount ||
                          activeOrder.metodePembayaran) && (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                              marginTop: "4px",
                            }}
                          >
                            {activeOrder.serviceType && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  color: "#0369a1",
                                  background: "#e0f2fe",
                                  padding: "2px 7px",
                                  borderRadius: "999px",
                                }}
                              >
                                Layanan: {activeOrder.serviceType}
                              </span>
                            )}
                            {activeOrder.passengerCount && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#475569",
                                  background: "#e2e8f0",
                                  padding: "2px 7px",
                                  borderRadius: "999px",
                                }}
                              >
                                {activeOrder.passengerCount} Penumpang
                              </span>
                            )}
                            {activeOrder.metodePembayaran && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  color: "#15803d",
                                  background: "#dcfce7",
                                  padding: "2px 7px",
                                  borderRadius: "999px",
                                }}
                              >
                                {activeOrder.metodePembayaran}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDriverTab("chat")}
                        className="button button-outline"
                        style={{
                          fontSize: "12px",
                          padding: "8px 14px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#f0f9ff",
                          borderColor: "#7dd3fc",
                          color: "#0284c7",
                          fontWeight: 800,
                        }}
                      >
                        <MessageSquare size={14} /> Chat Penumpang
                      </button>
                    </div>

                    {/* Route Details */}
                    <div
                      className="order-route compact"
                      style={{ marginBottom: "16px" }}
                    >
                      <div>
                        <MapPin size={16} color="#0284c7" />
                        <span>{activeOrder.jemputAlamat}</span>
                      </div>
                      <div>
                        <Route size={16} color="#ea580c" />
                        <span>{activeOrder.tujuanAlamat}</span>
                      </div>
                      {activeOrder.catatan && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#334155",
                            background: "#f0f9ff",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            borderLeft: "3px solid #0284c7",
                            marginTop: "6px",
                          }}
                        >
                          📝 Catatan Penumpang:{" "}
                          <strong>{activeOrder.catatan}</strong>
                        </div>
                      )}
                    </div>

                    {/* Shimmering Progress Bar */}
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12px",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ color: "#64748b", fontWeight: 600 }}>
                          Progres Perjalanan:
                        </span>
                        <strong style={{ color: "#0284c7" }}>
                          {Math.round(activeOrder.simulationProgress)}%
                        </strong>
                      </div>
                      <div
                        className="shimmer-bar"
                        style={{
                          height: "9px",
                          background: "#e2e8f0",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${activeOrder.simulationProgress}%`,
                            background:
                              "linear-gradient(90deg, #0284c7, #38bdf8)",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* REAL-TIME TIP NOTIFICATION CARD (MUNCUL OTOMATIS SAAT PENUMPANG MEMBERI TIP) */}
                    {activeOrder.tip != null && activeOrder.tip > 0 ? (
                      <div
                        className="pop-in-success"
                        style={{
                          background:
                            "linear-gradient(135deg, #fefce8 0%, #fef08a 100%)",
                          border: "2px solid #eab308",
                          borderRadius: "14px",
                          padding: "16px",
                          marginBottom: "18px",
                          boxShadow: "0 8px 24px rgba(234, 179, 8, 0.25)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span style={{ fontSize: "18px" }}>🎁</span>
                            <strong
                              style={{
                                fontSize: "13px",
                                color: "#854d0e",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              TIP PENUMPANG DITERIMA!
                            </strong>
                          </div>
                          <span
                            style={{
                              fontSize: "17px",
                              fontWeight: 900,
                              color: "#a16207",
                            }}
                          >
                            +{currency(activeOrder.tip)}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: "12px",
                            color: "#713f12",
                            lineHeight: "1.4",
                          }}
                        >
                          Penumpang{" "}
                          <strong>
                            {activeOrder.penumpangNama || "Rina Kusuma"}
                          </strong>{" "}
                          menambahkan tip atas kenyamanan perjalanan.
                        </p>
                        <div
                          style={{
                            borderTop: "1px dashed #ca8a04",
                            paddingTop: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            color: "#854d0e",
                            fontWeight: 700,
                          }}
                        >
                          <span>Total Masuk Saldo:</span>
                          <span>
                            {currency(
                              (activeOrder.totalBayar ?? activeOrder.tarif) +
                                activeOrder.tip,
                            )}
                          </span>
                        </div>
                      </div>
                    ) : activeOrder.status === "SELESAI" ? (
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          marginBottom: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#166534",
                              fontWeight: 700,
                            }}
                          >
                            STATUS PERJALANAN:
                          </span>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "#15803d",
                            }}
                          >
                            LUNAS ·{" "}
                            {currency(
                              activeOrder.totalBayar ?? activeOrder.tarif,
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          ✓ Selesai di Tujuan
                        </span>
                      </div>
                    ) : null}

                    {/* Driver Action & Auto-Sync Controls */}
                    {activeOrder.status === "SELESAI" ? (
                      <button
                        type="button"
                        className="button button-primary button-full shimmer-bar"
                        onClick={handleDismissOrder}
                        disabled={actionLoading}
                        style={{
                          padding: "14px",
                          fontWeight: 800,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          background:
                            "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          borderColor: "#22c55e",
                        }}
                      >
                        {actionLoading
                          ? "Menyimpan..."
                          : "Perjalanan Selesai · Kembali Siap di Antrean Pangkalan"}
                        <ArrowRight size={17} />
                      </button>
                    ) : (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: "12px",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#0284c7",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span className="pulse-live-dot" />
                            {autoSimDriver
                              ? "JALAN OTOMATIS AKTIF"
                              : "JALAN OTOMATIS DIJEDA"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAutoSimDriver(!autoSimDriver)}
                            style={{
                              background: autoSimDriver ? "#e0f2fe" : "#f1f5f9",
                              color: autoSimDriver ? "#0284c7" : "#475569",
                              border: "1px solid #bae6fd",
                              borderRadius: "6px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {autoSimDriver ? (
                              <Pause size={12} />
                            ) : (
                              <Play size={12} />
                            )}
                            {autoSimDriver ? "Jeda" : "Lanjut Otomatis"}
                          </button>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                          }}
                        >
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={handleAdvanceOrder}
                            disabled={actionLoading}
                            style={{
                              padding: "10px 12px",
                              fontWeight: 700,
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <ArrowRight size={14} /> Percepat (+25%)
                          </button>

                          <button
                            type="button"
                            className="button button-primary shimmer-bar"
                            onClick={handleInstantFinishDriver}
                            disabled={actionLoading}
                            style={{
                              padding: "10px 12px",
                              fontWeight: 800,
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <Sparkles size={14} /> ⚡ Tiba di Tujuan
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          ) : (
            /* When Waiting for Orders: Radar Scanner Animation */
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #bae6fd",
                borderRadius: "20px",
                padding: "40px 20px",
                textAlign: "center",
                boxShadow: "0 8px 30px rgba(2, 132, 199, 0.08)",
              }}
            >
              {!isOnline ? (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "36px 20px",
                    textAlign: "center",
                    maxWidth: "460px",
                    margin: "0 auto",
                  }}
                >
                  <Power
                    size={36}
                    color="#94a3b8"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <strong
                    style={{
                      fontSize: "16px",
                      display: "block",
                      color: "#334155",
                    }}
                  >
                    Status Anda Sedang Offline
                  </strong>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      margin: "6px 0 18px",
                    }}
                  >
                    Aktifkan mode online untuk mulai menerima pesanan dari
                    pangkalan Majalengka.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleOnline}
                    className="button button-primary"
                    style={{ margin: "0 auto" }}
                  >
                    <Power size={16} /> Aktifkan Mode Online Sekarang
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: "480px", margin: "0 auto" }}>
                  {/* High-Tech Rotating 360 Radar Sweep */}
                  <div className="radar-sweep-container">
                    <div className="radar-sweep-ring" />
                    <div className="radar-sweep-beam" />
                    <div
                      className="radar-blip"
                      style={{ top: "26%", left: "60%" }}
                    />
                    <div
                      className="radar-blip"
                      style={{
                        bottom: "30%",
                        left: "32%",
                        animationDelay: "1.3s",
                      }}
                    />
                    <Radar
                      size={36}
                      color="#0284c7"
                      style={{ position: "relative", zIndex: 3 }}
                    />
                  </div>

                  <strong
                    style={{
                      fontSize: "18px",
                      color: "#0f172a",
                      display: "block",
                      fontWeight: 800,
                    }}
                  >
                    Menunggu Pesanan Masuk
                  </strong>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#0369a1",
                      margin: "8px auto 16px",
                      lineHeight: "1.5",
                    }}
                  >
                    Anda berada di antrean nomor 1 pangkalan Alun-Alun.
                    Notifikasi akan berbunyi begitu ada pesanan baru masuk.
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#f0f9ff",
                      color: "#0284c7",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "999px",
                      border: "1px solid #bae6fd",
                    }}
                  >
                    <span className="pulse-live-dot" />
                    SIAP MENERIMA PESANAN
                  </div>

                  {/* Quick Test Order Button */}
                  <div
                    style={{
                      marginTop: "22px",
                      borderTop: "1px dashed #bae6fd",
                      paddingTop: "18px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSimulateIncomingOrder}
                      disabled={actionLoading}
                      className="button button-primary shimmer-bar"
                      style={{
                        padding: "12px 24px",
                        fontSize: "13px",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background:
                          "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                        boxShadow: "0 6px 20px rgba(2, 132, 199, 0.35)",
                        margin: "0 auto",
                      }}
                    >
                      <Zap size={16} fill="currentColor" /> ⚡ Buat Contoh
                      Pesanan Masuk
                    </button>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        margin: "8px 0 0 0",
                      }}
                    >
                      Coba terima pesanan masuk langsung dari halaman ini
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ULASAN & PENILAIAN PELANGGAN (TERURUT DARI TERBARU KE TERLAMA) */}
        {/* ============================================================== */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            padding: "28px",
            boxShadow: "var(--shadow)",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#0284c7",
                  letterSpacing: "0.5px",
                }}
              >
                ULASAN PELANGGAN TERBARU
              </span>
              <h2
                style={{
                  fontSize: "20px",
                  color: "#0f172a",
                  fontWeight: 800,
                  margin: "4px 0 0",
                }}
              >
                Ulasan & Penilaian Pelanggan ({reviews.length} Ulasan)
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                  border: "1px solid #7dd3fc",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  color: "#0369a1",
                  fontWeight: 800,
                  fontSize: "12px",
                }}
              >
                <span>{driver?.badge || "🏆 Peringkat 1 · Driver Terbaik"}</span>
                <span>· Peringkat #{driver?.rank || 1}/{driver?.totalDrivers || 6}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#fefce8",
                  border: "1px solid #fef08a",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  color: "#854d0e",
                  fontWeight: 800,
                  fontSize: "14px",
                }}
              >
                <Star size={18} fill="#eab308" color="#eab308" />
                <span>
                  {driver?.ratingAverage
                    ? driver.ratingAverage.toFixed(2)
                    : "4.95"}{" "}
                  / 5.0 ({driver?.totalTrips || 48} Trip)
                </span>
              </div>
            </div>
          </div>

          {/* Ringkasan Statistik Rating & Apresiasi Tip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
              background: "#f8fafc",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Total Perjalanan Selesai
              </span>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                {driver?.totalTrips || 48} Perjalanan
              </div>
              <small style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
                ✓ 100% Bebas Komplain
              </small>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Ulasan Tertulis Masuk
              </span>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0284c7" }}>
                {reviews.length} Ulasan
              </div>
              <small style={{ fontSize: "11px", color: "#64748b" }}>
                Sinkron riwayat pelanggan
              </small>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Total Apresiasi Tip Diterima
              </span>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#a16207" }}>
                {currency(
                  reviews.reduce((sum, r) => sum + (r.tip || 0), 0) ||
                    driver?.tipsReceived ||
                    31000,
                )}
              </div>
              <small style={{ fontSize: "11px", color: "#854d0e", fontWeight: 700 }}>
                🎁 100% Hak Penuh Driver
              </small>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Skor Performa Pangkalan
              </span>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803d" }}>
                {driver?.performanceScore || 98.5} / 100
              </div>
              <small style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
                ★ Sangat Memuaskan
              </small>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {(showAllReviews ? reviews : reviews.slice(0, 6)).map((rev) => (
              <div
                key={rev.id}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "18px",
                  transition: "transform 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize: "14px",
                        color: "#0f172a",
                        display: "block",
                      }}
                    >
                      {rev.penumpangNama}
                    </strong>
                    <small style={{ color: "#64748b", fontSize: "11px" }}>
                      {formatReviewDynamicTime(rev, currentClientTime)}
                    </small>
                  </div>
                  <div
                    style={{ display: "flex", gap: "2px", color: "#eab308" }}
                  >
                    {Array.from({ length: rev.skor }).map((_, i) => (
                      <Star key={i} size={15} fill="currentColor" />
                    ))}
                  </div>
                </div>

                {rev.rute && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    📍 {rev.rute}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      background: "#f0f9ff",
                      color: "#0284c7",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid #bae6fd",
                    }}
                  >
                    {rev.kategori}
                  </span>
                  {rev.tip != null && rev.tip > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#fef9c3",
                        color: "#854d0e",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        border: "1px solid #fde047",
                      }}
                    >
                      🎁 Tip: +{currency(rev.tip)}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#334155",
                    lineHeight: "1.5",
                  }}
                >
                  &ldquo;{rev.komentar}&rdquo;
                </p>
              </div>
            ))}
          </div>

          {reviews.length > 6 && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setShowAllReviews((prev) => !prev)}
                style={{ fontSize: "12px", fontWeight: 700, padding: "8px 18px" }}
              >
                {showAllReviews
                  ? "Ringkas Tampilan (6 Ulasan Terbaru)"
                  : `Tampilkan Seluruh Ulasan (${reviews.length} Ulasan)`}
              </button>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* POPUP NOTIFIKASI ORDER BARU MASUK (MODAL SIAGA)                */}
        {/* ============================================================== */}
        {incomingAlertOrder && !activeOrder && isOnline && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(6px)",
              zIndex: 9999,
              display: "grid",
              placeItems: "center",
              padding: "16px",
            }}
          >
            <div
              className="responsive-modal-box pop-in-success"
              style={{
                background: "#ffffff",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "480px",
                maxHeight: "92vh",
                overflowY: "auto",
                padding: "28px",
                boxShadow: "0 25px 60px -15px rgba(2, 132, 199, 0.35)",
                border: "2px solid #38bdf8",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f0f9ff",
                    color: "#0284c7",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    border: "1px solid #bae6fd",
                  }}
                >
                  <BellRing size={15} className="icon-pulse" />
                  PESANAN BARU MASUK!
                </div>
                <button
                  type="button"
                  title="Tutup popup (tetap tampil di daftar pesanan)"
                  onClick={() =>
                    setDismissedModalIds((prev) => [
                      ...prev,
                      incomingAlertOrder.id,
                    ])
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <h2
                style={{
                  fontSize: "22px",
                  color: "#0f172a",
                  fontWeight: 800,
                  margin: "0 0 4px",
                }}
              >
                Permintaan Penjemputan
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: "0 0 20px",
                }}
              >
                Dari Penumpang:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {incomingAlertOrder.penumpangNama ||
                    incomingAlertOrder.penumpang?.nama ||
                    "Rina Kusuma"}
                </strong>
                {incomingAlertOrder.serviceType && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#0284c7",
                      background: "#e0f2fe",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {incomingAlertOrder.serviceType}
                    {incomingAlertOrder.passengerCount
                      ? ` · ${incomingAlertOrder.passengerCount} Org`
                      : ""}
                  </span>
                )}
              </p>

              {/* Route Summary */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "grid",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <MapPin
                    size={18}
                    color="#0284c7"
                    style={{ marginTop: "2px", flexShrink: 0 }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      TITIK JEMPUT:
                    </span>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      {incomingAlertOrder.jemputAlamat}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <Route
                    size={18}
                    color="#ea580c"
                    style={{ marginTop: "2px", flexShrink: 0 }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      TUJUAN:
                    </span>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      {incomingAlertOrder.tujuanAlamat}
                    </div>
                  </div>
                </div>

                {incomingAlertOrder.catatan && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#334155",
                      background: "#ffffff",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      borderLeft: "3px solid #0284c7",
                    }}
                  >
                    📝 Catatan: <strong>{incomingAlertOrder.catatan}</strong>
                  </div>
                )}

                <div
                  style={{
                    borderTop: "1px dashed #cbd5e1",
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Tarif Bersih:
                    </span>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#0284c7",
                      }}
                    >
                      {currency(
                        incomingAlertOrder.totalBayar ??
                          incomingAlertOrder.tarif,
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#16a34a",
                      fontWeight: 700,
                    }}
                  >
                    ✓{" "}
                    {incomingAlertOrder.metodePembayaran === "TUNAI"
                      ? "Bayar Tunai"
                      : "Terverifikasi Lunas"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => handleRejectOrder(incomingAlertOrder.id)}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: "12px" }}
                >
                  Lewati
                </button>
                <button
                  type="button"
                  className="button button-primary shimmer-bar"
                  onClick={() => handleAcceptOrder(incomingAlertOrder.id)}
                  disabled={actionLoading}
                  style={{
                    flex: 2,
                    padding: "12px",
                    fontWeight: 800,
                    fontSize: "15px",
                  }}
                >
                  <Zap size={16} /> TERIMA ORDER SEKARANG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
