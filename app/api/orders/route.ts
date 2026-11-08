import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoadRoute } from "@/lib/geo";
import { getSession } from "@/lib/auth";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = 'force-dynamic';

function formatTanggal(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Number(searchParams.get("limit") || 10));
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        penumpang: true,
        promo: true,
      },
    });

    return NextResponse.json({ orders });
  } catch {
    // Ambil order aktif dari sharedStore jika database offline
    const storeOrders = sharedStore.getIncomingOrders();
    return NextResponse.json({ orders: storeOrders });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const jemputAlamat = String(body?.jemputAlamat || "Alun-Alun Majalengka & Masjid Agung Al-Imam");
  const jemputLat = Number(body?.jemputLat) || -6.8362;
  const jemputLng = Number(body?.jemputLng) || 108.2281;
  const tujuanAlamat = String(body?.tujuanAlamat || "Bunderan Munjul & Tugu Bola Dunia");
  const tujuanLat = Number(body?.tujuanLat) || -6.8295;
  const tujuanLng = Number(body?.tujuanLng) || 108.2198;
  const penumpangNama = String(body?.penumpangNama || "Rina Kusuma");
  const penumpangEmail = String(body?.penumpangEmail || "rina@becak.test").toLowerCase();
  const promoKode = body?.promoKode ? String(body.promoKode).trim().toUpperCase() : null;
  const serviceTypeRaw = body?.serviceType ? String(body.serviceType).toUpperCase() : "REGULER";
  const serviceType = (
    ["REGULER", "KARGO", "WISATA"].includes(serviceTypeRaw) ? serviceTypeRaw : "REGULER"
  ) as "REGULER" | "KARGO" | "WISATA";
  const passengerCount = Number(body?.passengerCount) === 2 ? 2 : 1;
  const catatan = body?.catatan ? String(body.catatan).slice(0, 200) : undefined;
  const metodePembayaran = body?.metodePembayaran === "CASH" ? "CASH" : "QRIS";

  const startLat = jemputLat;
  const startLng = jemputLng;
  const endLat = tujuanLat;
  const endLng = tujuanLng;
  const route = await getRoadRoute(startLat, startLng, endLat, endLng);

  const serviceAddon = serviceType === "KARGO" ? 2000 : serviceType === "WISATA" ? 3000 : 0;
  const computedTarif = 5000 + Math.round(route.distanceKm * 3000) + serviceAddon;
  const tarif =
    typeof body?.tarif === "number" && body.tarif > 0 ? Math.round(body.tarif) : computedTarif;
  const computedDiskon =
    promoKode === "HIJAUMAJALENGKA"
      ? Math.min(Math.round((tarif * 30) / 100), 3000)
      : promoKode === "UNMAHEMAT"
      ? Math.min(Math.round((tarif * 25) / 100), 8000)
      : promoKode
      ? Math.min(Math.round((tarif * 20) / 100), 10000)
      : 0;
  const diskon =
    typeof body?.diskon === "number" && body.diskon >= 0
      ? Math.round(body.diskon)
      : computedDiskon;
  const totalBayar =
    typeof body?.totalBayar === "number" && body.totalBayar >= 0
      ? Math.round(body.totalBayar)
      : Math.max(0, tarif - diskon);
  const mockOrderCode = `ORD-${formatTanggal(new Date())}-${Math.floor(100 + Math.random() * 900)}`;

  // 1. Buat order langsung di sharedStore (Single Source of Truth agar sinkron 100% dengan Driver & Chat)
  const newOrder = sharedStore.createOrder({
    kode: mockOrderCode,
    status: "MENCARI_DRIVER",
    jemputAlamat: jemputAlamat.slice(0, 255),
    jemputLat: startLat,
    jemputLng: startLng,
    tujuanAlamat: tujuanAlamat.slice(0, 255),
    tujuanLat: endLat,
    tujuanLng: endLng,
    penumpangNama,
    penumpangEmail,
    penumpangNoHp: "081298765432",
    jarakKm: route.distanceKm,
    durasiMenit: route.durationMinutes,
    tarif,
    promoKode: promoKode || undefined,
    diskon,
    totalBayar,
    serviceType,
    passengerCount,
    catatan,
    metodePembayaran,
    simulationProgress: 0,
    routeGeometry: JSON.stringify(route.coordinates),
  });

  // 2. Sinkronkan ke Prisma secara non-blocking di latar belakang
  void (async () => {
    try {
      const session = await getSession();
      const pangkalan = await prisma.pangkalan.findFirst().catch(() => null);
      if (pangkalan) {
        let user = await prisma.user.findUnique({ where: { email: penumpangEmail } }).catch(() => null);
        if (!user && session?.userId) {
          user = await prisma.user.findUnique({ where: { id: session.userId } }).catch(() => null);
        }
        if (user) {
          await prisma.order.create({
            data: {
              kode: newOrder.kode,
              pangkalanId: pangkalan.id,
              penumpangId: user.id,
              jemputAlamat: newOrder.jemputAlamat,
              jemputLat: newOrder.jemputLat,
              jemputLng: newOrder.jemputLng,
              tujuanAlamat: newOrder.tujuanAlamat,
              tujuanLat: newOrder.tujuanLat,
              tujuanLng: newOrder.tujuanLng,
              jarakKm: newOrder.jarakKm,
              durasiMenit: newOrder.durasiMenit,
              tarif: newOrder.tarif,
              promoKode: promoKode || null,
              diskon: newOrder.diskon,
              totalBayar: newOrder.totalBayar,
              status: "MENCARI_DRIVER",
              routeGeometry: newOrder.routeGeometry,
              simulationProgress: 0,
            },
          });
        }
      }
    } catch {
      // background sync optional
    }
  })();

  return NextResponse.json({
    success: true,
    order: newOrder,
    route,
    message: "Pesanan berhasil dibuat! Sedang mencari mitra driver terdekat...",
  });
}
