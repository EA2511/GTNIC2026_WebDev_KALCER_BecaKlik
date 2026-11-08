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

    const ratingInfo = sharedStore.getDriverRating();
    const driverStats = sharedStore.getDriverStats();
    const rankedFleet = sharedStore.getFleetDrivers();
    const driverOneRank = rankedFleet.find((d) => d.rawId === 1) || rankedFleet[0];

    const sharedIncoming = sharedStore.getIncomingOrders();
    const sharedActiveOrder = sharedStore.getActiveOrder(1);

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
