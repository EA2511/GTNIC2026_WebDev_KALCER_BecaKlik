import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, deltaPercent, forceAdvance } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "orderId diperlukan untuk simulasi." },
        { status: 400 }
      );
    }

    const oId = Number(orderId);
    const stepDelta = deltaPercent != null ? Number(deltaPercent) : 2;
    const clientProgress = body.currentProgress != null ? Number(body.currentProgress) : null;

    let targetOrder = sharedStore.getOrder(oId);
    if (!targetOrder) {
      targetOrder = sharedStore.getActiveOrder();
    }

    if (!targetOrder) {
      try {
        const dbOrder = await prisma.order.findUnique({
          where: { id: oId },
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
          targetOrder = sharedStore.createOrder({
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
            driverId: dbOrder.driverId || 1,
          });
        }
      } catch {}
    }

    if (
      targetOrder &&
      clientProgress != null &&
      targetOrder.status !== "MENCARI_DRIVER" &&
      (clientProgress < 100 || forceAdvance) &&
      clientProgress > (targetOrder.simulationProgress || 0)
    ) {
      targetOrder.simulationProgress = clientProgress;
    }

    // 1. Majukan simulasi di sharedStore (Single Source of Truth untuk Pelanggan & Driver)
    const updatedOrder = sharedStore.stepOrder(targetOrder ? targetOrder.id : oId, stepDelta, Boolean(forceAdvance));

    if (updatedOrder) {
      const currentLoc: [number, number] = updatedOrder.driver
        ? [updatedOrder.driver.currentLat, updatedOrder.driver.currentLng]
        : [updatedOrder.jemputLat, updatedOrder.jemputLng];
      const currentHeading = updatedOrder.driver?.heading ?? 0;

      // 2. Sinkronkan ke Prisma secara non-blocking jika DB online
      void prisma.order
        .update({
          where: { id: oId },
          data: {
            status: updatedOrder.status,
            simulationProgress: updatedOrder.simulationProgress,
            ...(updatedOrder.status === "SELESAI" ? { completedAt: new Date() } : {}),
          },
        })
        .catch(() => {});

      const message =
        updatedOrder.status === "SELESAI"
          ? "Perjalanan selesai! Anda telah tiba di tujuan dengan selamat."
          : updatedOrder.status === "BERJALAN"
          ? `Sedang mengantar ke lokasi tujuan di Majalengka (${Math.round(updatedOrder.simulationProgress)}%)...`
          : `Mitra Driver bergerak menuju titik penjemputan (${Math.round(updatedOrder.simulationProgress)}%)...`;

      return NextResponse.json({
        success: true,
        orderId: oId,
        status: updatedOrder.status,
        progress: updatedOrder.simulationProgress,
        currentLocation: currentLoc,
        heading: currentHeading,
        order: updatedOrder,
        message,
      });
    }

    return NextResponse.json({
      success: false,
      orderId: oId,
      message: "Order belum terdaftar di memori aktif.",
    });
  } catch (error) {
    console.error("Error in /api/simulation/step:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Gagal memajukan simulasi.",
      },
      { status: 500 }
    );
  }
}
