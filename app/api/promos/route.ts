import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const DEFAULT_MAJALENGKA_PROMOS = [
  {
    id: 1,
    kode: "BECAKBARU",
    judul: "Diskon Sambutan Pengguna Baru",
    deskripsi: "Potongan 20% di seluruh koridor Kota Majalengka (Maks. Rp10.000)",
    diskonPersen: 20,
    maksimalDiskon: 10000,
    minimalTransaksi: 5000,
    aktif: true,
  },
  {
    id: 2,
    kode: "HIJAUMAJALENGKA",
    judul: "Subsidi Mobilitas Hijau Majalengka",
    deskripsi: "Potongan 30% untuk perjalanan ramah lingkungan ke Pasar & RSUD (Maks. Rp3.000)",
    diskonPersen: 30,
    maksimalDiskon: 3000,
    minimalTransaksi: 5000,
    aktif: true,
  },
  {
    id: 3,
    kode: "UNMAHEMAT",
    judul: "Voucher Pelajar & Mahasiswa UNMA",
    deskripsi: "Diskon 25% perjalanan edukasi & kampus Majalengka (Maks. Rp8.000)",
    diskonPersen: 25,
    maksimalDiskon: 8000,
    minimalTransaksi: 5000,
    aktif: true,
  },
];

export async function GET() {
  try {
    const dbPromos = await prisma.promo.findMany({
      where: { aktif: true },
      orderBy: { id: "asc" },
    });

    const mergedMap = new Map<string, (typeof DEFAULT_MAJALENGKA_PROMOS)[0]>();
    for (const p of DEFAULT_MAJALENGKA_PROMOS) {
      mergedMap.set(p.kode, p);
    }
    for (const dbP of dbPromos) {
      if (!mergedMap.has(dbP.kode)) {
        mergedMap.set(dbP.kode, {
          id: dbP.id,
          kode: dbP.kode,
          judul: dbP.judul,
          deskripsi: dbP.deskripsi,
          diskonPersen: dbP.diskonPersen,
          maksimalDiskon: dbP.maksimalDiskon,
          minimalTransaksi: dbP.minimalTransaksi,
          aktif: dbP.aktif,
        });
      }
    }

    return NextResponse.json({ promos: Array.from(mergedMap.values()) });
  } catch (error) {
    console.warn("DB offline di GET /api/promos, menggunakan promo default Majalengka:", error);
    return NextResponse.json({ promos: DEFAULT_MAJALENGKA_PROMOS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { kode, tarif } = body;

    if (!kode || typeof tarif !== "number") {
      return NextResponse.json(
        { message: "Kode promo dan nominal tarif wajib diisi." },
        { status: 400 }
      );
    }

    const cleanCode = String(kode).trim().toUpperCase();

    const defaultMatch = DEFAULT_MAJALENGKA_PROMOS.find((p) => p.kode === cleanCode);
    if (defaultMatch) {
      const diskon = Math.min(Math.round((tarif * defaultMatch.diskonPersen) / 100), defaultMatch.maksimalDiskon);
      const totalBayar = Math.max(0, tarif - diskon);
      return NextResponse.json({
        valid: true,
        promo: defaultMatch,
        tarif,
        diskon,
        totalBayar,
        message: `Promo ${defaultMatch.kode} berhasil diterapkan! Hemat Rp${diskon.toLocaleString("id-ID")}.`,
      });
    }

    try {
      const promo = await prisma.promo.findUnique({
        where: { kode: cleanCode },
      });

      if (promo && promo.aktif) {
        if (promo.berlakuHingga && new Date() > promo.berlakuHingga) {
          return NextResponse.json(
            { valid: false, message: "Masa berlaku promo ini telah berakhir." },
            { status: 400 }
          );
        }

        if (tarif < promo.minimalTransaksi) {
          return NextResponse.json(
            {
              valid: false,
              message: `Minimal transaksi untuk promo ini adalah Rp${promo.minimalTransaksi.toLocaleString("id-ID")}.`,
            },
            { status: 400 }
          );
        }

        const rawDiskon = Math.round((tarif * promo.diskonPersen) / 100);
        const diskon = Math.min(rawDiskon, promo.maksimalDiskon);
        const totalBayar = Math.max(0, tarif - diskon);

        return NextResponse.json({
          valid: true,
          promo: {
            id: promo.id,
            kode: promo.kode,
            judul: promo.judul,
            deskripsi: promo.deskripsi,
            diskonPersen: promo.diskonPersen,
            maksimalDiskon: promo.maksimalDiskon,
          },
          tarif,
          diskon,
          totalBayar,
          message: `Promo ${promo.kode} berhasil diterapkan! Hemat Rp${diskon.toLocaleString("id-ID")}.`,
        });
      }
    } catch {
      // Offline fallback handling
    }

    return NextResponse.json(
      { valid: false, message: "Kode promo tidak ditemukan atau sudah tidak aktif." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in POST /api/promos:", error);
    return NextResponse.json(
      { message: "Gagal memverifikasi promo." },
      { status: 500 }
    );
  }
}
