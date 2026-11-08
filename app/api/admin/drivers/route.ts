import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const rankedDrivers = sharedStore.getFleetDrivers();
  const ratingInfo = sharedStore.getDriverRating();

  const data = rankedDrivers.map((d) => ({
    id: d.id,
    rawId: d.rawId,
    nama: d.nama,
    email: d.email,
    noHp: d.noHp,
    unit: d.unit,
    status: d.statusLabel,
    rawStatus: d.status,
    trips: d.trips,
    completedToday: d.completedToday,
    income: d.income,
    tipsReceived: d.tipsReceived,
    battery: d.battery,
    rating: d.rating,
    rank: d.rank,
    performanceScore: d.performanceScore,
    badge: d.badge,
    onTimeRate: d.onTimeRate,
    ecoScore: d.ecoScore,
    koridor: d.koridor,
  }));

  return NextResponse.json({
    drivers: data,
    recentReviews: ratingInfo.allReviews,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, email, noHp, kodeUnit } = body;

    if (!nama || !email || !kodeUnit) {
      return NextResponse.json(
        { message: "Nama, email, dan kode unit armada wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Langsung daftarkan ke sharedStore real-time (dan tersimpan di cache disk)
    const addedDriver = sharedStore.addFleetDriver({
      nama,
      email,
      noHp,
      kodeUnit,
    });

    // 2. Sinkronkan ke Prisma secara opsional di latar belakang
    void (async () => {
      try {
        const pangkalan = await prisma.pangkalan.findFirst();
        if (!pangkalan) return;
        const passwordHash = await bcrypt.hash("password123", 10);
        const user = await prisma.user.create({
          data: {
            nama,
            email: email.trim().toLowerCase(),
            noHp: noHp || null,
            passwordHash,
            role: "DRIVER",
            pangkalanId: pangkalan.id,
          },
        });
        const driver = await prisma.driver.create({
          data: {
            userId: user.id,
            pangkalanId: pangkalan.id,
            status: "ONLINE",
            currentLat: pangkalan.lat,
            currentLng: pangkalan.lng,
          },
        });
        await prisma.vehicle.create({
          data: {
            pangkalanId: pangkalan.id,
            kodeUnit: kodeUnit.toUpperCase(),
            status: "TERSEDIA",
            driverId: driver.id,
            batteryPct: 95,
          },
        });
      } catch {
        // optional DB sync
      }
    })();

    return NextResponse.json({
      success: true,
      message: `Mitra pengemudi ${addedDriver.nama} (${addedDriver.unit}) berhasil didaftarkan dan langsung aktif di peringkat pangkalan!`,
      driver: addedDriver,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/drivers:", error);
    return NextResponse.json(
      { message: "Gagal menambahkan driver baru." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { driverId, status, action } = body;

    const id = Number(driverId);
    if (!id) {
      return NextResponse.json(
        { message: "ID Driver tidak valid." },
        { status: 400 }
      );
    }

    const validStatus = ["OFFLINE", "ONLINE", "ON_TRIP"];
    const mappedFromAction =
      action === "SET_ONLINE"
        ? "ONLINE"
        : action === "SET_OFFLINE"
        ? "OFFLINE"
        : "";
    const targetStatus = String(status || mappedFromAction).toUpperCase();

    if (!validStatus.includes(targetStatus)) {
      return NextResponse.json(
        { message: "Status tidak valid." },
        { status: 400 }
      );
    }

    const updatedInStore = sharedStore.setFleetDriverStatus(
      id,
      targetStatus as "OFFLINE" | "ONLINE" | "ON_TRIP"
    );

    void prisma.driver
      .update({
        where: { id },
        data: { status: targetStatus as "OFFLINE" | "ONLINE" | "ON_TRIP" },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      driver: updatedInStore || { id, status: targetStatus },
    });
  } catch (error) {
    console.error("Error in PATCH /api/admin/drivers:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui status pengemudi." },
      { status: 500 }
    );
  }
}
