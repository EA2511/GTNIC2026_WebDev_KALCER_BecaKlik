import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [pangkalan, driver, order, antrean, poi, unit] = await Promise.all([
      prisma.pangkalan.count(),
      prisma.driver.count(),
      prisma.order.count(),
      prisma.driverQueue.count({ where: { status: "MENUNGGU" } }),
      prisma.servicePoint.count(),
      prisma.vehicle.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      pangkalan,
      driver,
      order,
      antrean,
      poi,
      unit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "error", pesan: "Database tidak terhubung" },
      { status: 500 }
    );
  }
}
