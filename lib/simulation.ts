// =====================================================
// Mesin Simulasi Pergerakan Driver & Siklus Order
// Mengontrol Pergerakan Spasial, Interpolasi Rute, & Transisi Status
// =====================================================
import { prisma } from "@/lib/prisma";
import { getRoadRoute, interpolateRoutePosition, LatLng } from "@/lib/geo";
import { sharedStore } from "@/lib/sharedStore";

export interface SimulationStepResult {
  success: boolean;
  orderId: number;
  status: string;
  progress: number;
  currentLocation: LatLng;
  heading: number;
  message: string;
}

/**
 * Memastikan rute polyline koordinat jalan tersedia untuk order
 */
export async function ensureOrderRouteGeometry(orderId: number): Promise<LatLng[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { pangkalan: true },
  });

  if (!order) throw new Error("Order tidak ditemukan");

  if (order.routeGeometry) {
    try {
      const parsed = JSON.parse(order.routeGeometry);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as LatLng[];
      }
    } catch {
      // JSON parse gagal, recalculate
    }
  }

  // Hitung rute jalan riil via OSRM / Fallback
  const startLat = order.jemputLat ?? order.pangkalan.lat;
  const startLng = order.jemputLng ?? order.pangkalan.lng;
  const destLat = order.tujuanLat ?? order.pangkalan.lat + 0.01;
  const destLng = order.tujuanLng ?? order.pangkalan.lng + 0.005;

  const routeResult = await getRoadRoute(startLat, startLng, destLat, destLng);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      routeGeometry: JSON.stringify(routeResult.coordinates),
      jarakKm: routeResult.distanceKm,
      durasiMenit: routeResult.durationMinutes,
    },
  });

  return routeResult.coordinates;
}

/**
 * Memajukan progres simulasi perjalanan satu langkah
 */
export async function stepOrderSimulation(
  orderId: number,
  deltaPercent = 12
): Promise<SimulationStepResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      driver: { include: { user: true } },
      vehicle: true,
      pangkalan: true,
    },
  });

  if (!order) {
    throw new Error(`Order #${orderId} tidak ditemukan.`);
  }

  const coordinates = await ensureOrderRouteGeometry(order.id);

  // 0. Jika sudah SELESAI atau deltaPercent >= 100 (Instant Tiba di Tujuan untuk Demo/Juri), kunci 100% SELESAI permanen
  if (order.status === "SELESAI" || deltaPercent >= 100) {
    const lastCoord: LatLng =
      coordinates.length > 0
        ? coordinates[coordinates.length - 1]
        : [order.tujuanLat ?? -6.8295, order.tujuanLng ?? 108.2198];

    const now = new Date();
    const finalPrice = order.totalBayar > 0 ? order.totalBayar : order.tarif;

    try {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "SELESAI",
            simulationProgress: 100,
            completedAt: now,
          },
        }),
        prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            jumlah: finalPrice,
            metode: "QRIS",
            status: "LUNAS",
            paidAt: now,
          },
          update: {
            jumlah: finalPrice,
            status: "LUNAS",
            paidAt: now,
          },
        }),
        ...(order.driverId
          ? [
              prisma.driver.update({
                where: { id: order.driverId },
                data: {
                  status: "ONLINE",
                  currentLat: lastCoord[0],
                  currentLng: lastCoord[1],
                },
              }),
            ]
          : []),
      ]);
    } catch {
      // offline / mock mode
    }

    sharedStore.updateOrderProgress(order.id, 100, "SELESAI", lastCoord, 0);

    return {
      success: true,
      orderId: order.id,
      status: "SELESAI",
      progress: 100,
      currentLocation: lastCoord,
      heading: 0,
      message: "Perjalanan telah selesai di titik tujuan dengan selamat.",
    };
  }

  // 1. Jika masih MENCARI_DRIVER, jalankan dispatch otomatis
  if (order.status === "MENCARI_DRIVER") {
    const { assignDriverToOrder } = await import("@/lib/dispatch");
    const assigned = await assignDriverToOrder(order.id);
    if (!assigned) {
      return {
        success: false,
        orderId: order.id,
        status: order.status,
        progress: 0,
        currentLocation: [order.jemputLat ?? -6.8362, order.jemputLng ?? 108.2281],
        heading: 0,
        message: "Menunggu driver tersedia dalam antrean pangkalan...",
      };
    }
    return {
      success: true,
      orderId: order.id,
      status: "DITERIMA",
      progress: 5,
      currentLocation: [
        assigned.driver?.currentLat ?? -6.8362,
        assigned.driver?.currentLng ?? 108.2281,
      ],
      heading: 0,
      message: `Driver ${assigned.driver?.user.nama} menerima pesanan.`,
    };
  }

  // 2. Jika status DITERIMA: Driver mulai menuju penjemputan
  if (order.status === "DITERIMA") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "DIJEMPUT", simulationProgress: 10 },
    });
    sharedStore.updateOrderProgress(order.id, 10, "DIJEMPUT", coordinates[0], 0);
    return {
      success: true,
      orderId: order.id,
      status: "DIJEMPUT",
      progress: 10,
      currentLocation: coordinates[0],
      heading: 0,
      message: "Driver bergerak menuju lokasi penjemputan penumpang.",
    };
  }

  // 3. Jika status DIJEMPUT: Driver dalam perjalanan menuju titik jemput (10% -> 25%)
  if (order.status === "DIJEMPUT") {
    const currentProgress = Math.max(10, Number(order.simulationProgress));
    const nextProgress = Math.min(25, currentProgress + Math.max(5, deltaPercent * 0.5));

    if (nextProgress >= 25) {
      // Driver tiba di titik jemput, penumpang naik, lanjut BERJALAN tanpa reset!
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "BERJALAN",
          simulationProgress: 25,
        },
      });

      if (order.driverId) {
        await prisma.driver.update({
          where: { id: order.driverId },
          data: {
            currentLat: coordinates[0][0],
            currentLng: coordinates[0][1],
          },
        });
      }

      sharedStore.updateOrderProgress(order.id, 25, "BERJALAN", coordinates[0], 0);

      return {
        success: true,
        orderId: order.id,
        status: "BERJALAN",
        progress: 25,
        currentLocation: coordinates[0],
        heading: 0,
        message: "Driver telah tiba di titik jemput. Penumpang naik, perjalanan dimulai!",
      };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { simulationProgress: nextProgress },
    });

    sharedStore.updateOrderProgress(order.id, nextProgress, "DIJEMPUT", coordinates[0], 0);

    return {
      success: true,
      orderId: order.id,
      status: "DIJEMPUT",
      progress: nextProgress,
      currentLocation: coordinates[0],
      heading: 0,
      message: `Driver menuju penjemputan (${Math.round(nextProgress)}%)`,
    };
  }

  // 4. Jika status BERJALAN: Menuju titik tujuan (25% -> 100%)
  if (order.status === "BERJALAN") {
    const currentProgress = Math.max(25, Number(order.simulationProgress));
    const nextProgress = Math.min(100, currentProgress + deltaPercent);

    if (nextProgress >= 100) {
      // Perjalanan Selesai
      const now = new Date();
      const finalPrice = order.totalBayar > 0 ? order.totalBayar : order.tarif;
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "SELESAI",
            simulationProgress: 100,
            completedAt: now,
          },
        }),
        prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            jumlah: finalPrice,
            metode: "QRIS",
            status: "LUNAS",
            paidAt: now,
          },
          update: {
            jumlah: finalPrice,
            status: "LUNAS",
            paidAt: now,
          },
        }),
        ...(order.driverId
          ? [
              prisma.driver.update({
                where: { id: order.driverId },
                data: {
                  status: "ONLINE",
                  currentLat: coordinates[coordinates.length - 1][0],
                  currentLng: coordinates[coordinates.length - 1][1],
                },
              }),
              prisma.driverQueue.create({
                data: {
                  pangkalanId: order.pangkalanId,
                  driverId: order.driverId,
                  status: "MENUNGGU",
                  joinedAt: now,
                },
              }),
            ]
          : []),
      ]);

      const lastPos = coordinates[coordinates.length - 1];
      sharedStore.updateOrderProgress(order.id, 100, "SELESAI", lastPos, 0);
      return {
        success: true,
        orderId: order.id,
        status: "SELESAI",
        progress: 100,
        currentLocation: lastPos,
        heading: 0,
        message: "Perjalanan telah selesai! Anda tiba di tujuan dengan selamat.",
      };
    }

    // Hitung posisi interpolasi rute antara penjemputan dan tujuan (25% - 100% -> 0% - 100% rute)
    const routeRatio = Math.max(0, Math.min(1, (nextProgress - 25) / 75));
    const interp = interpolateRoutePosition(coordinates, routeRatio * 100);

    await prisma.order.update({
      where: { id: order.id },
      data: { simulationProgress: nextProgress },
    });

    if (order.driverId) {
      await prisma.driver.update({
        where: { id: order.driverId },
        data: {
          currentLat: interp.position[0],
          currentLng: interp.position[1],
          heading: interp.heading,
          lastActiveAt: new Date(),
        },
      });
    }

    sharedStore.updateOrderProgress(order.id, nextProgress, "BERJALAN", interp.position, interp.heading);

    return {
      success: true,
      orderId: order.id,
      status: "BERJALAN",
      progress: nextProgress,
      currentLocation: interp.position,
      heading: interp.heading,
      message: `Sedang mengantar ke lokasi tujuan (${Math.round(nextProgress)}%)`,
    };
  }

  // Jika sudah selesai atau dibatalkan
  return {
    success: true,
    orderId: order.id,
    status: order.status,
    progress: 100,
    currentLocation: coordinates[coordinates.length - 1] ?? [-6.8295, 108.2198],
    heading: 0,
    message: `Pesanan telah ${order.status.toLowerCase()}.`,
  };
}

/**
 * Reset skenario demo secara aman (tanpa menghapus database)
 */
export async function resetDemoScenario() {
  const pangkalan = await prisma.pangkalan.findFirst();
  if (!pangkalan) return false;

  const drivers = await prisma.driver.findMany({ include: { vehicle: true } });
  const poiList = await prisma.servicePoint.findMany();

  for (let i = 0; i < drivers.length; i++) {
    const d = drivers[i];
    const poi = poiList[i % poiList.length];
    await prisma.driver.update({
      where: { id: d.id },
      data: {
        status: "ONLINE",
        currentLat: poi?.lat ?? pangkalan.lat,
        currentLng: poi?.lng ?? pangkalan.lng,
        heading: (i * 90) % 360,
      },
    });

    if (d.vehicle) {
      await prisma.vehicle.update({
        where: { id: d.vehicle.id },
        data: { status: "TERSEDIA" },
      });
    }
  }

  await prisma.driverQueue.updateMany({
    where: { pangkalanId: pangkalan.id },
    data: { status: "MENUNGGU" },
  });

  const activeOrder = await prisma.order.findFirst({
    orderBy: { id: "desc" },
  });

  if (activeOrder) {
    await prisma.order.update({
      where: { id: activeOrder.id },
      data: {
        status: "MENCARI_DRIVER",
        driverId: null,
        vehicleId: null,
        simulationProgress: 0,
        completedAt: null,
      },
    });
  }

  return true;
}
