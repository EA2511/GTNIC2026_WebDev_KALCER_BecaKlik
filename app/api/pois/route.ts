import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAJALENGKA_LOCATIONS } from "@/lib/majalengkaLocations";

export const dynamic = "force-dynamic";

const FALLBACK_PANGKALAN = {
  id: 1,
  nama: "Pangkalan Becak Listrik Alun-Alun Majalengka",
  alamat: "Kawasan Alun-Alun Jl. KH Abdul Halim, Majalengka, Jawa Barat",
  lat: -6.8362,
  lng: 108.2281,
  radiusKm: 4.2,
  tarifDasar: 5000,
  tarifPerKm: 3000,
};

export async function GET() {
  try {
    const pangkalan = await prisma.pangkalan.findFirst({
      include: {
        servicePoints: {
          orderBy: { isDepot: "desc" },
        },
      },
    });

    if (pangkalan) {
      // Gabungkan seluruh 70+ lokasi Majalengka dengan servicePoints dari DB agar direktori selalu lengkap
      const mergedMap = new Map<string, (typeof MAJALENGKA_LOCATIONS)[0]>();
      for (const loc of MAJALENGKA_LOCATIONS) {
        mergedMap.set(loc.nama.toLowerCase(), loc);
      }
      if (pangkalan.servicePoints) {
        for (const sp of pangkalan.servicePoints) {
          const key = sp.nama.toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, {
              id: sp.id,
              pangkalanId: sp.pangkalanId,
              nama: sp.nama,
              kategori: sp.kategori,
              alamat: sp.alamat || "Kawasan Majalengka",
              lat: sp.lat,
              lng: sp.lng,
              isDepot: sp.isDepot,
            });
          }
        }
      }

      return NextResponse.json({
        pangkalan: {
          id: pangkalan.id,
          nama: pangkalan.nama,
          alamat: pangkalan.alamat,
          lat: pangkalan.lat,
          lng: pangkalan.lng,
          radiusKm: pangkalan.radiusKm,
          tarifDasar: pangkalan.tarifDasar,
          tarifPerKm: pangkalan.tarifPerKm,
        },
        servicePoints: Array.from(mergedMap.values()),
      });
    }

    return NextResponse.json({
      pangkalan: FALLBACK_PANGKALAN,
      servicePoints: MAJALENGKA_LOCATIONS,
    });
  } catch (error) {
    console.warn(
      "DB offline saat memuat POI Majalengka, menggunakan direktori lengkap:",
      error,
    );
    return NextResponse.json({
      pangkalan: FALLBACK_PANGKALAN,
      servicePoints: MAJALENGKA_LOCATIONS,
    });
  }
}
