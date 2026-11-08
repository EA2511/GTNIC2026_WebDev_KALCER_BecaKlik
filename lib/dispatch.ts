// =====================================================
// Sistem Dispatch & Penetapan Driver (FIFO & Spasial)
// Mengutamakan Keadilan Mitra (FIFO Pangkalan) & Integritas Transaksi
// =====================================================
import { prisma } from "@/lib/prisma";

export async function findNextAvailableDriver(pangkalanId: number) {
  // 1. Cek antrean FIFO resmi pangkalan
  const queueEntry = await prisma.driverQueue.findFirst({
    where: {
      pangkalanId,
      status: "MENUNGGU",
      driver: {
        status: "ONLINE",
        vehicle: { isNot: null },
      },
    },
    include: {
      driver: {
        include: {
          user: true,
          vehicle: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc", // First-In, First-Served
    },
  });

  if (queueEntry && queueEntry.driver.vehicle) {
    return {
      driver: queueEntry.driver,
      vehicle: queueEntry.driver.vehicle,
      queueId: queueEntry.id,
    };
  }

  // 2. Fallback: Cari driver berstatus ONLINE di pangkalan yang unitnya tersedia
  const directDriver = await prisma.driver.findFirst({
    where: {
      pangkalanId,
      status: "ONLINE",
      vehicle: {
        status: "TERSEDIA",
      },
    },
    include: {
      user: true,
      vehicle: true,
    },
  });

  if (directDriver && directDriver.vehicle) {
    return {
      driver: directDriver,
      vehicle: directDriver.vehicle,
      queueId: null,
    };
  }

  return null;
}

export async function assignDriverToOrder(orderId: number, manualDriverId?: number) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { pangkalan: true },
    });

    if (!order) {
      throw new Error(`Order #${orderId} tidak ditemukan.`);
    }

    if (order.status !== "MENCARI_DRIVER") {
      throw new Error(`Order #${order.kode} sudah memiliki status '${order.status}'.`);
    }

    let selectedDriver;
    let selectedVehicle;
    let queueId: number | null = null;

    if (manualDriverId) {
      const driver = await tx.driver.findUnique({
        where: { id: manualDriverId },
        include: { user: true, vehicle: true },
      });
      if (!driver || !driver.vehicle) {
        throw new Error("Driver pilihan tidak valid atau tidak memiliki unit armada.");
      }
      selectedDriver = driver;
      selectedVehicle = driver.vehicle;

      const queueRecord = await tx.driverQueue.findFirst({
        where: { driverId: driver.id, status: "MENUNGGU" },
      });
      if (queueRecord) queueId = queueRecord.id;
    } else {
      const match = await findNextAvailableDriver(order.pangkalanId);
      if (!match) {
        return null; // Belum ada driver yang tersedia
      }
      selectedDriver = match.driver;
      selectedVehicle = match.vehicle;
      queueId = match.queueId;
    }

    // Update Status Order, Driver, Vehicle, dan Antrean dalam 1 Transaksi Atomik
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        driverId: selectedDriver.id,
        vehicleId: selectedVehicle.id,
        status: "DITERIMA",
        acceptedAt: new Date(),
        simulationProgress: 0,
      },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        penumpang: true,
      },
    });

    await tx.driver.update({
      where: { id: selectedDriver.id },
      data: { status: "ON_TRIP" },
    });

    await tx.vehicle.update({
      where: { id: selectedVehicle.id },
      data: { status: "DIPAKAI" },
    });

    if (queueId) {
      await tx.driverQueue.update({
        where: { id: queueId },
        data: {
          status: "DILAYANI",
          servedAt: new Date(),
        },
      });
    }

    return updatedOrder;
  });
}
