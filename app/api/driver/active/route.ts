import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = "force-dynamic";

const driverStatusMap = new Map<number, "ONLINE" | "OFFLINE" | "ON_TRIP">();
driverStatusMap.set(1, "ONLINE");

const FALLBACK_DRIVER = {
  id: 1,
  nama: "Budi Santoso",
  email: "budi@becak.test",
  unit: "BL-001",
  batteryPct: 94,
  status: "ONLINE",
};

export async function GET() {
  try {
    const session = await getSession();

    // 0. Sinkronkan ulasan riil dari database PostgreSQL agar ulasan yang baru dikirim penumpang langsung tampil
    try {
      const dbRatings = await prisma.rating.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              penumpang: { select: { nama: true } },
            },
          },
        },
      });
      if (dbRatings && dbRatings.length > 0) {
        sharedStore.syncDbRatings(
          dbRatings.map((dr) => ({
            id: dr.id,
            orderId: dr.orderId,
            penumpangNama: dr.order?.penumpang?.nama || "Pelanggan BecakListrik",
            skor: dr.skor,
            kategori: dr.kategori || "Sangat Memuaskan",
            komentar: dr.komentar || "Perjalanan hening dan nyaman.",
            rute: dr.order ? `${dr.order.jemputAlamat} ➔ ${dr.order.tujuanAlamat}` : undefined,
            createdAt: dr.createdAt.toISOString(),
            timestamp: dr.createdAt.getTime(),
          }))
        );
      }
    } catch {}

    const ratingInfo = sharedStore.getDriverRating();
    const driverStats = sharedStore.getDriverStats();
    const rankedFleet = sharedStore.getFleetDrivers();
    const driverOneRank = rankedFleet.find((d) => d.rawId === 1) || rankedFleet[0];

    const sharedIncoming = sharedStore.getIncomingOrders();
    let sharedActiveOrder = sharedStore.getActiveOrder(1);

    if (!sharedActiveOrder) {
      try {
        const dbOrder = await prisma.order.findFirst({
          where: {
            driverId: 1,
            status: { in: ["DITERIMA", "DIJEMPUT", "BERJALAN"] },
          },
          orderBy: { id: "desc" },
          include: {
            driver: {
              include: {
                user: { select: { nama: true, noHp: true } },
                vehicle: true,
              },
            },
            penumpang: { select: { id: true, nama: true, noHp: true } },
          },
        });
        if (dbOrder) {
          sharedActiveOrder = sharedStore.createOrder({
            id: dbOrder.id,
            kode: dbOrder.kode,
            status: dbOrder.status as any,
            simulationProgress: dbOrder.simulationProgress || 5,
            jemputAlamat: dbOrder.jemputAlamat,
            jemputLat: dbOrder.jemputLat ?? -6.8362,
            jemputLng: dbOrder.jemputLng ?? 108.2281,
            tujuanAlamat: dbOrder.tujuanAlamat,
            tujuanLat: dbOrder.tujuanLat ?? -6.8400,
            tujuanLng: dbOrder.tujuanLng ?? 108.2250,
            jarakKm: Number(dbOrder.jarakKm || 2.5),
            durasiMenit: dbOrder.durasiMenit,
            tarif: dbOrder.tarif,
            diskon: dbOrder.diskon,
            tip: 0,
            totalBayar: dbOrder.totalBayar,
            metodePembayaran: "QRIS",
            penumpangNama: dbOrder.penumpang?.nama || "Rina Kusuma",
            driverId: 1,
          });
        }
      } catch {}
    }

    const activeDriverStatus =
      sharedStore.getDriverStatus() || driverStatusMap.get(1) || "ONLINE";

    return NextResponse.json({
      driver: {
        ...FALLBACK_DRIVER,
        nama:
          session?.role === "DRIVER" &&
          session?.nama &&
          session.nama !== "Rina Kusuma"
            ? session.nama
            : FALLBACK_DRIVER.nama,
        status: activeDriverStatus,
        ratingAverage: ratingInfo.rating,
        totalTrips: ratingInfo.trips,
        rank: driverOneRank?.rank || 1,
        totalDrivers: rankedFleet.length,
        performanceScore: driverOneRank?.performanceScore || 98.5,
        badge: driverOneRank?.badge || "🏆 Peringkat 1 · Driver Terbaik",
        tipsReceived: driverOneRank?.tipsReceived || 31000,
      },
      activeOrder: sharedActiveOrder,
      incomingOrders: sharedIncoming,
      recentReviews: ratingInfo.reviews,
      leaderboard: rankedFleet,
      stats: {
        completedToday: driverStats.completedToday,
        earningsToday: driverStats.earningsToday,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/driver/active:", error);
    const activeDriverStatus =
      sharedStore.getDriverStatus() || driverStatusMap.get(1) || "ONLINE";
    const ratingInfo = sharedStore.getDriverRating();
    const driverStats = sharedStore.getDriverStats();
    const rankedFleet = sharedStore.getFleetDrivers();
    return NextResponse.json({
      driver: {
        ...FALLBACK_DRIVER,
        status: activeDriverStatus,
        ratingAverage: ratingInfo.rating,
        totalTrips: ratingInfo.trips,
        rank: 1,
        totalDrivers: rankedFleet.length,
        performanceScore: 98.5,
      },
      activeOrder: null,
      incomingOrders: sharedStore.getIncomingOrders(),
      recentReviews: ratingInfo.reviews,
      leaderboard: rankedFleet,
      stats: {
        completedToday: driverStats.completedToday,
        earningsToday: driverStats.earningsToday,
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { driverId, action, status: requestedStatus, orderId, trips, orderData } = body;

    const id = Number(driverId) || 1;

    if (action === "SYNC_HISTORY" && Array.isArray(trips)) {
      sharedStore.syncPassengerHistory(trips);

      // Sinkronkan ulasan ke PostgreSQL database di latar belakang
      void (async () => {
        try {
          const pangkalan = await prisma.pangkalan.findFirst().catch(() => null);
          const passengerUser =
            (await prisma.user.findFirst({ where: { role: "PENUMPANG" } }).catch(() => null)) ||
            (await prisma.user.findFirst().catch(() => null));

          for (const t of trips) {
            if (!t || !t.id || t.id === 990 || t.id === 991 || t.id === 1001) continue;
            if (!t.ratingScore) continue;

            const existingOrder = await prisma.order.findUnique({ where: { id: t.id } }).catch(() => null);
            if (!existingOrder && pangkalan && passengerUser) {
              await prisma.order.create({
                data: {
                  id: t.id,
                  kode: t.kode || `ORD-${t.id}`,
                  pangkalanId: pangkalan.id,
                  penumpangId: passengerUser.id,
                  jemputAlamat: t.jemputAlamat || "Titik Jemput Majalengka",
                  jemputLat: -6.8362,
                  jemputLng: 108.2281,
                  tujuanAlamat: t.tujuanAlamat || "Titik Tujuan Majalengka",
                  tujuanLat: -6.8400,
                  tujuanLng: 108.2250,
                  jarakKm: t.jarakKm || 2,
                  durasiMenit: t.durasiMenit || 8,
                  tarif: t.tarif || 10000,
                  diskon: t.diskon || 0,
                  totalBayar: t.totalBayar || 10000,
                  status: "SELESAI",
                  simulationProgress: 100,
                },
              }).catch(() => null);
            }

            await prisma.rating.upsert({
              where: { orderId: t.id },
              create: {
                orderId: t.id,
                skor: t.ratingScore || 5,
                kategori: t.ratingCategory || "Sangat Memuaskan",
                komentar: t.ratingComment || "Perjalanan hening dan nyaman.",
              },
              update: {
                skor: t.ratingScore || 5,
                kategori: t.ratingCategory || "Sangat Memuaskan",
                komentar: t.ratingComment || "Perjalanan hening dan nyaman.",
              },
            }).catch(() => null);
          }
        } catch {}
      })();

      const ratingInfo = sharedStore.getDriverRating();
      const driverStats = sharedStore.getDriverStats();
      return NextResponse.json({
        success: true,
        recentReviews: ratingInfo.reviews,
        stats: {
          completedToday: driverStats.completedToday,
          earningsToday: driverStats.earningsToday,
        },
        totalTrips: ratingInfo.trips,
        ratingAverage: ratingInfo.rating,
      });
    }

    if (action === "ACCEPT_ORDER" && orderId) {
      const accepted = sharedStore.acceptOrder(Number(orderId), id, orderData);
      void prisma.order
        .update({
          where: { id: Number(orderId) },
          data: { status: "DITERIMA", driverId: id },
        })
        .catch(() => {});
      return NextResponse.json({
        success: true,
        order: accepted,
        message: "Pesanan berhasil diterima!",
      });
    }

    if (action === "SET_STATUS" || action === "TOGGLE_ONLINE") {
      let nextStatus: "ONLINE" | "OFFLINE" = "ONLINE";

      if (action === "SET_STATUS" && requestedStatus) {
        nextStatus = requestedStatus === "OFFLINE" ? "OFFLINE" : "ONLINE";
      } else {
        const current = driverStatusMap.get(id) || "OFFLINE";
        nextStatus = current === "ONLINE" ? "OFFLINE" : "ONLINE";
      }

      driverStatusMap.set(id, nextStatus);
      sharedStore.setDriverStatus(nextStatus);

      void prisma.driver
        .update({
          where: { id },
          data: { status: nextStatus },
        })
        .catch(() => {});

      return NextResponse.json({ success: true, status: nextStatus });
    }

    if (action === "ADVANCE_ORDER" && orderId) {
      const updated = sharedStore.stepOrder(Number(orderId), 25, true);
      if (updated) {
        void prisma.order
          .update({
            where: { id: Number(orderId) },
            data: {
              status: updated.status,
              simulationProgress: updated.simulationProgress,
              ...(updated.status === "SELESAI" ? { completedAt: new Date() } : {}),
            },
          })
          .catch(() => {});
        return NextResponse.json({
          success: true,
          order: updated,
          status: updated.status,
          progress: updated.simulationProgress,
          message: "Progres perjalanan dimajukan.",
        });
      }
      return NextResponse.json({ success: true, message: "Order advanced" });
    }

    if (action === "DISMISS_ORDER") {
      sharedStore.dismissOrder(Number(orderId) || undefined);
      driverStatusMap.set(id, "ONLINE");
      void prisma.order
        .updateMany({
          where: { status: { in: ["DITERIMA", "DIJEMPUT", "BERJALAN"] } },
          data: { status: "SELESAI", simulationProgress: 100 },
        })
        .catch(() => {});
      return NextResponse.json({
        success: true,
        activeOrder: null,
        message: "Order telah diselesaikan dan ditutup oleh pengemudi.",
      });
    }

    if (action === "SIMULATE_INCOMING_ORDER") {
      const simKode = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-SIM${Math.floor(100 + Math.random() * 900)}`;
      const demoOrder = sharedStore.createOrder({
        kode: simKode,
        status: "MENCARI_DRIVER",
        jemputAlamat: "Alun-Alun Majalengka & Masjid Agung Al-Imam",
        jemputLat: -6.8362,
        jemputLng: 108.2281,
        tujuanAlamat: "Bunderan Munjul & Tugu Bola Dunia",
        tujuanLat: -6.8295,
        tujuanLng: 108.2198,
        penumpangNama: "Rina Kusuma",
        penumpangEmail: "rina@becak.test",
        penumpangNoHp: "081298765432",
        jarakKm: 1.6,
        durasiMenit: 8,
        tarif: 9800,
        diskon: 0,
        totalBayar: 9800,
        simulationProgress: 0,
        routeGeometry: "",
      });

      void prisma.order
        .create({
          data: {
            kode: demoOrder.kode,
            status: "MENCARI_DRIVER",
            jemputAlamat: demoOrder.jemputAlamat,
            jemputLat: demoOrder.jemputLat,
            jemputLng: demoOrder.jemputLng,
            tujuanAlamat: demoOrder.tujuanAlamat,
            tujuanLat: demoOrder.tujuanLat,
            tujuanLng: demoOrder.tujuanLng,
            tarif: demoOrder.tarif,
            totalBayar: demoOrder.totalBayar,
            jarakKm: demoOrder.jarakKm,
            durasiMenit: demoOrder.durasiMenit,
            penumpangId: 1,
            pangkalanId: 1,
          },
        })
        .catch(() => {});

      return NextResponse.json({
        success: true,
        order: demoOrder,
        incomingOrders: sharedStore.getIncomingOrders(),
        message: "Pesanan baru masuk!",
      });
    }

    if (action === "REJECT_ORDER" && orderId) {
      sharedStore.cancelOrder(Number(orderId));
      return NextResponse.json({
        success: true,
        incomingOrders: sharedStore
          .getIncomingOrders()
          .filter((o) => o.id !== Number(orderId)),
        message: "Pesanan berhasil dilewati.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Aksi berhasil diproses.",
    });
  } catch (error) {
    console.error("Error in POST /api/driver/active:", error);
    return NextResponse.json({ success: true, status: "ONLINE" });
  }
}
