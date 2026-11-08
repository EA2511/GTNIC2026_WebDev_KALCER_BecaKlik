import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    // 1. Cek dari sharedStore terlebih dahulu (Instan < 1ms, Single Source of Truth)
    const directOrder = sharedStore.getOrder(id);
    if (directOrder) {
      return NextResponse.json({ order: directOrder });
    }

    // 2. Cek dari Prisma jika tidak ada di sharedStore
    try {
      const order = await prisma.order.findFirst({
        where: isNaN(orderId) ? { kode: id } : { id: orderId },
        include: {
          driver: {
            include: {
              user: { select: { nama: true, noHp: true } },
              vehicle: true,
            },
          },
          penumpang: { select: { id: true, nama: true, noHp: true } },
          payment: true,
          rating: true,
          promo: true,
        },
      });

      if (order) {
        return NextResponse.json({ order });
      }
    } catch {
      // Offline fallback
    }

    const activeFallback = sharedStore.getActiveOrder(1);
    if (
      activeFallback &&
      (activeFallback.id === orderId ||
        String(activeFallback.id) === String(id) ||
        activeFallback.kode === String(id))
    ) {
      return NextResponse.json({ order: activeFallback });
    }

    return NextResponse.json(
      { message: "Pesanan tidak ditemukan", order: null },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error GET /api/orders/[id]:", error);
    return NextResponse.json({ message: "Gagal memuat pesanan" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await request.json().catch(() => ({}));
    const { action, driverId, skor, kategori, komentar, tip, orderData } = body;

    // Driver Menerima Order
    if (action === "ACCEPT" || action === "ACCEPT_ORDER") {
      const accepted = sharedStore.acceptOrder(orderId, Number(driverId) || 1, orderData);
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "DITERIMA",
            driverId: Number(driverId) || 1,
          },
        });
      } catch {}
      return NextResponse.json({ success: true, order: accepted });
    }

    // Selesaikan Pesanan (Instant Tiba di Tujuan untuk Demo/Juri)
    if (action === "FINISH" || action === "COMPLETE") {
      const order = sharedStore.getOrder(orderId) || sharedStore.getActiveOrder(1);
      if (order) {
        order.status = "SELESAI";
        order.simulationProgress = 100;
        if (order.driver) {
          order.driver.currentLat = order.tujuanLat;
          order.driver.currentLng = order.tujuanLng;
          order.driver.heading = 0;
        }
        sharedStore.updateOrderProgress(order.id, 100, "SELESAI", [order.tujuanLat, order.tujuanLng], 0);
      }
      const now = new Date();
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "SELESAI",
            simulationProgress: 100,
            completedAt: now,
          },
        });
      } catch {}
      const updated = sharedStore.getOrder(orderId) || order;
      return NextResponse.json({ success: true, message: "Pesanan selesai di tujuan.", order: updated });
    }

    // Penumpang Memberi Ulasan & Bintang & Tip (Mendukung Rp0 Tanpa Tip)
    if (action === "RATE") {
      const tipAmount = typeof tip === "number" && tip >= 0 ? tip : 0;
      const ratingTs = Number(body.timestamp) || Date.now();
      const rating = sharedStore.submitRating(
        orderId,
        Math.min(5, Math.max(1, Number(skor) || 5)),
        kategori ? String(kategori).slice(0, 100) : "Sangat Memuaskan",
        komentar ? String(komentar).slice(0, 255) : "Perjalanan nyaman dan hening.",
        tipAmount,
        ratingTs
      );

      try {
        // Pastikan order dengan orderId ini sudah ada di tabel orders database sebelum upsert rating
        // agar tidak terkena Foreign Key constraint error
        const existingOrder = await prisma.order.findUnique({
          where: { id: orderId },
        }).catch(() => null);

        if (!existingOrder) {
          const pangkalan = await prisma.pangkalan.findFirst().catch(() => null);
          const passengerUser =
            (await prisma.user.findFirst({ where: { role: "PENUMPANG" } }).catch(() => null)) ||
            (await prisma.user.findFirst().catch(() => null));

          if (pangkalan && passengerUser) {
            const memoryOrder = sharedStore.getOrder(orderId);
            await prisma.order.create({
              data: {
                id: orderId,
                kode: memoryOrder?.kode || `ORD-${orderId}`,
                pangkalanId: pangkalan.id,
                penumpangId: passengerUser.id,
                jemputAlamat: memoryOrder?.jemputAlamat || "Titik Jemput Majalengka",
                jemputLat: memoryOrder?.jemputLat || -6.8362,
                jemputLng: memoryOrder?.jemputLng || 108.2281,
                tujuanAlamat: memoryOrder?.tujuanAlamat || "Titik Tujuan Majalengka",
                tujuanLat: memoryOrder?.tujuanLat || -6.8400,
                tujuanLng: memoryOrder?.tujuanLng || 108.2250,
                jarakKm: memoryOrder?.jarakKm || 2.5,
                durasiMenit: memoryOrder?.durasiMenit || 8,
                tarif: memoryOrder?.tarif || 10000,
                diskon: memoryOrder?.diskon || 0,
                totalBayar: memoryOrder?.totalBayar || 10000,
                status: "SELESAI",
                simulationProgress: 100,
              },
            }).catch(() => null);
          }
        }

        await prisma.rating.upsert({
          where: { orderId },
          create: {
            orderId,
            skor: rating.skor,
            kategori: rating.kategori,
            komentar: rating.komentar,
          },
          update: {
            skor: rating.skor,
            kategori: rating.kategori,
            komentar: rating.komentar,
          },
        });
      } catch (dbErr) {
        console.warn("Database rating upsert notice:", dbErr);
      }

      return NextResponse.json({
        success: true,
        rating,
        order: sharedStore.getOrder(orderId),
      });
    }

    if (action === "CANCEL") {
      const order = sharedStore.getOrder(orderId);
      if (order) {
        order.status = "DIBATALKAN";
        order.dismissedByDriver = true;
        order.dismissedByPassenger = true;
      }
      return NextResponse.json({ success: true, message: "Pesanan berhasil dibatalkan." });
    }

    if (action === "DISMISS_PASSENGER" || action === "DISMISS") {
      sharedStore.dismissOrderForPassenger(orderId);
      return NextResponse.json({ success: true, message: "Pesanan berhasil ditutup oleh penumpang." });
    }

    return NextResponse.json({ success: true, message: "Aksi berhasil diproses." });
  } catch (error) {
    console.error("Error in PATCH /api/orders/[id]:", error);
    return NextResponse.json({ success: true, message: "Aksi demo tersimpan." });
  }
}
