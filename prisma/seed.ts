// =====================================================
// Seed: Mengisi database dengan DATA DEMO REALISTIS KAWASAN
// Stack: Next.js + Prisma 6 + MySQL
// Terintegrasi Promo Sambutan, Onboarding, Kendaraan & In-App Chat
// =====================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// POI Kawasan Kota Majalengka, Jawa Barat
const POI_LIST = [
  {
    nama: "Alun-Alun Majalengka & Masjid Agung Al-Imam",
    kategori: "DEPOT",
    alamat: "Jl. Alun-Alun Barat, Majalengka Kulon",
    lat: -6.8362,
    lng: 108.2281,
    isDepot: true,
  },
  {
    nama: "Bunderan Munjul & Tugu Bola Dunia",
    kategori: "LANDMARK",
    alamat: "Bunderan Munjul, Jl. KH Abdul Halim",
    lat: -6.8295,
    lng: 108.2198,
    isDepot: false,
  },
  {
    nama: "Pasar Mambo Majalengka",
    kategori: "KULINER",
    alamat: "Jl. Babakan Mambo, Majalengka Wetan",
    lat: -6.8385,
    lng: 108.2305,
    isDepot: false,
  },
  {
    nama: "Taman Dirgantara Munjul",
    kategori: "WISATA",
    alamat: "Jl. KH Abdul Halim No. 1, Munjul",
    lat: -6.8270,
    lng: 108.2175,
    isDepot: false,
  },
  {
    nama: "Gedung Juang Majalengka",
    kategori: "SEJARAH",
    alamat: "Jl. KH Abdul Halim, Majalengka Kulon",
    lat: -6.8340,
    lng: 108.2260,
    isDepot: false,
  },
  {
    nama: "Pasar Balong Majalengka",
    kategori: "PASAR",
    alamat: "Jl. KH Abdul Halim No. 200",
    lat: -6.8355,
    lng: 108.2272,
    isDepot: false,
  },
  {
    nama: "Taman Raharja Majalengka",
    kategori: "WISATA",
    alamat: "Jl. KH Abdul Halim, Munjul",
    lat: -6.8282,
    lng: 108.2188,
    isDepot: false,
  },
];

function formatTanggal(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function bersihkanData() {
  await prisma.chatMessage.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.logUnit.deleteMany();
  await prisma.driverQueue.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.servicePoint.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pangkalan.deleteMany();
  await prisma.systemSetting.deleteMany();
}

async function main() {
  console.log("Membersihkan data lama...");
  await bersihkanData();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Pangkalan Utama
  const pangkalan = await prisma.pangkalan.create({
    data: {
      nama: "Pangkalan Becak Listrik Alun-Alun Majalengka",
      alamat: "Jl. Alun-Alun Barat, Majalengka Kulon, Kec. Majalengka",
      lat: -6.8362,
      lng: 108.2281,
      radiusKm: 6.0,
      tarifDasar: 5000,
      tarifPerKm: 3000,
    },
  });

  // 2. Service Points (POI)
  for (const poi of POI_LIST) {
    await prisma.servicePoint.create({
      data: {
        pangkalanId: pangkalan.id,
        nama: poi.nama,
        kategori: poi.kategori,
        alamat: poi.alamat,
        lat: poi.lat,
        lng: poi.lng,
        isDepot: poi.isDepot,
      },
    });
  }

  // 3. Program Promo Sambutan Pengguna Baru
  const promoSambutan = await prisma.promo.create({
    data: {
      kode: "BECAKBARU",
      judul: "Promo Sambutan Wisatawan Baru",
      deskripsi: "Diskon 20% khusus perjalanan pertamamu di kawasan wisata heritage (Maks. potongan Rp10.000)",
      diskonPersen: 20,
      maksimalDiskon: 10000,
      minimalTransaksi: 8000,
      aktif: true,
      berlakuHingga: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  await prisma.promo.create({
    data: {
      kode: "SUMBUHIJAU",
      judul: "Gerakan Nol Emisi Heritage",
      deskripsi: "Potongan flat Rp5.000 untuk perjalanan menuju Keraton & Museum Vredeburg",
      diskonPersen: 15,
      maksimalDiskon: 5000,
      minimalTransaksi: 10000,
      aktif: true,
      berlakuHingga: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
  });

  // 4. System Settings (Konfigurasi & Eco Analytics)
  const settings = [
    {
      kunci: "eco_factor_motor_ice_g_co2_per_km",
      nilai: "95",
      keterangan: "Emisi sepeda motor bensin ICE konvensional (gram CO2/km)",
    },
    {
      kunci: "eco_factor_becak_kwh_per_km",
      nilai: "0.035",
      keterangan: "Konsumsi energi becak listrik (kWh/km)",
    },
    {
      kunci: "simulation_speed_multiplier",
      nilai: "3",
      keterangan: "Pengali kecepatan simulasi rute",
    },
    {
      kunci: "service_zone_name",
      nilai: "Kawasan Wisata & Heritage Majalengka",
      keterangan: "Label zona operasional aktif",
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }

  // 5. Akun Admin
  await prisma.user.create({
    data: {
      nama: "Pak Slamet (Admin Pengelola)",
      email: "admin@becak.test",
      noHp: "081234560000",
      passwordHash,
      role: "ADMIN",
      pangkalanId: pangkalan.id,
      hasCompletedOnboarding: true,
    },
  });

  // 6. Driver + Unit Becak Listrik
  const daftarDriver = [
    {
      nama: "Budi Santoso",
      email: "budi@becak.test",
      noHp: "081234560001",
      unit: "BL-001",
      battery: 94,
      lat: -6.8350,
      lng: 108.2265,
      heading: 180,
      model: "Becak Listrik Majalengka EV",
      color: "Sky Blue & Cyan",
      rating: 4.95,
      trips: 48,
    },
    {
      nama: "Agus Prayitno",
      email: "agus@becak.test",
      noHp: "081234560002",
      unit: "BL-002",
      battery: 88,
      lat: -6.8320,
      lng: 108.2230,
      heading: 90,
      model: "Becak Listrik Majalengka EV",
      color: "Electric Blue & White",
      rating: 4.88,
      trips: 36,
    },
    {
      nama: "Joko Riyadi",
      email: "joko@becak.test",
      noHp: "081234560003",
      unit: "BL-003",
      battery: 79,
      lat: -6.8295,
      lng: 108.2198,
      heading: 270,
      model: "Becak Listrik Majalengka EV",
      color: "Deep Ocean Blue",
      rating: 4.92,
      trips: 28,
    },
    {
      nama: "Wawan Hermawan",
      email: "wawan@becak.test",
      noHp: "081234560004",
      unit: "BL-004",
      battery: 96,
      lat: -6.8385,
      lng: 108.2305,
      heading: 45,
      model: "Becak Listrik Majalengka EV",
      color: "Sky Blue & Silver",
      rating: 4.85,
      trips: 19,
    },
  ];

  const drivers: { id: number; vehicleId: number; userId: number; nama: string }[] = [];
  for (const d of daftarDriver) {
    const user = await prisma.user.create({
      data: {
        nama: d.nama,
        email: d.email,
        noHp: d.noHp,
        passwordHash,
        role: "DRIVER",
        pangkalanId: pangkalan.id,
        hasCompletedOnboarding: true,
      },
    });

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        pangkalanId: pangkalan.id,
        status: "ONLINE",
        currentLat: d.lat,
        currentLng: d.lng,
        heading: d.heading,
        ratingAverage: d.rating,
        totalTrips: d.trips,
      },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        pangkalanId: pangkalan.id,
        kodeUnit: d.unit,
        modelName: d.model,
        warna: d.color,
        kapasitas: 2,
        status: "TERSEDIA",
        driverId: driver.id,
        batteryPct: d.battery,
      },
    });

    drivers.push({ id: driver.id, vehicleId: vehicle.id, userId: user.id, nama: d.nama });
  }

  // Unit Cadangan di Depot Charging
  const cadangan = await prisma.vehicle.create({
    data: {
      pangkalanId: pangkalan.id,
      kodeUnit: "BL-005",
      modelName: "Becak Listrik Heritage EV (Cadangan)",
      warna: "Forest Green",
      kapasitas: 2,
      status: "CHARGING",
      batteryPct: 45,
    },
  });

  await prisma.logUnit.createMany({
    data: [
      {
        vehicleId: cadangan.id,
        jenis: "CHARGING",
        catatan: "Pengisian daya cepat di Stasiun Depot Alun-Alun Majalengka",
        biaya: 12000,
      },
      {
        vehicleId: cadangan.id,
        jenis: "SERVIS",
        catatan: "Pengecekan rutin sistem pengereman regenerative",
        biaya: 45000,
      },
    ],
  });

  // 7. Penumpang Demo
  // Rina Kartika: hasCompletedOnboarding: false (untuk menguji pengalaman onboarding pertama kali!)
  const userRina = await prisma.user.create({
    data: {
      nama: "Rina Kartika (Wisatawan)",
      email: "rina@becak.test",
      noHp: "081234560101",
      passwordHash,
      role: "PENUMPANG",
      hasCompletedOnboarding: false,
    },
  });

  const userDimas = await prisma.user.create({
    data: {
      nama: "Dimas Pratama (Tamu Demo)",
      email: "dimas@becak.test",
      noHp: "081234560102",
      passwordHash,
      role: "PENUMPANG",
      hasCompletedOnboarding: true,
    },
  });

  const userJuri = await prisma.user.create({
    data: {
      nama: "Juri / Auditor Independen",
      email: "juri@becak.test",
      noHp: "081234560103",
      passwordHash,
      role: "PENUMPANG",
      hasCompletedOnboarding: true,
    },
  });

  const penumpang = [userRina, userDimas, userJuri];

  // 8. Antrean Driver FIFO
  const sekarang = Date.now();
  for (const [i, d] of drivers.entries()) {
    await prisma.driverQueue.create({
      data: {
        pangkalanId: pangkalan.id,
        driverId: d.id,
        status: "MENUNGGU",
        joinedAt: new Date(sekarang - (40 - i * 10) * 60 * 1000),
      },
    });
  }

  // 9. Histori Perjalanan 7 Hari Terakhir
  let urutan = 1;
  for (let hari = 6; hari >= 0; hari--) {
    const jumlahOrder = 3 + (hari % 3);
    for (let n = 0; n < jumlahOrder; n++) {
      const driver = drivers[(hari + n) % drivers.length];
      const penumpangOrder = penumpang[(hari + n) % penumpang.length];
      const poiA = POI_LIST[(hari + n) % POI_LIST.length];
      const poiB = POI_LIST[(hari + n + 2) % POI_LIST.length];

      const jarak = 1.6 + ((hari + n) % 3) * 0.7;
      const tarif = pangkalan.tarifDasar + Math.round(jarak * pangkalan.tarifPerKm);
      const isPromo = n === 0;
      const diskon = isPromo ? Math.round(tarif * 0.2) : 0;
      const totalBayar = tarif - diskon;

      const dibuat = new Date(sekarang - hari * 24 * 3600 * 1000 - (n + 1) * 85 * 60 * 1000);
      const diterima = new Date(dibuat.getTime() + 2 * 60 * 1000);
      const selesai = new Date(dibuat.getTime() + 22 * 60 * 1000);

      const createdOrder = await prisma.order.create({
        data: {
          kode: `ORD-${formatTanggal(dibuat)}-${String(urutan++).padStart(3, "0")}`,
          pangkalanId: pangkalan.id,
          penumpangId: penumpangOrder.id,
          driverId: driver.id,
          vehicleId: driver.vehicleId,
          jemputAlamat: poiA.nama,
          jemputLat: poiA.lat,
          jemputLng: poiA.lng,
          tujuanAlamat: poiB.nama,
          tujuanLat: poiB.lat,
          tujuanLng: poiB.lng,
          jarakKm: jarak,
          durasiMenit: Math.round(jarak * 6 + 4),
          tarif,
          promoId: isPromo ? promoSambutan.id : null,
          promoKode: isPromo ? promoSambutan.kode : null,
          diskon,
          totalBayar,
          status: "SELESAI",
          simulationProgress: 100,
          createdAt: dibuat,
          acceptedAt: diterima,
          completedAt: selesai,
          payment: {
            create: {
              jumlah: totalBayar,
              metode: n % 2 === 0 ? "TUNAI" : "QRIS",
              status: "LUNAS",
              paidAt: selesai,
            },
          },
          rating: {
            create: {
              skor: 4 + ((hari + n) % 2),
              kategori: "Tepat Waktu & Hening",
              komentar: "Becak listrik nyaman, hening tanpa asap knalpot, driver ramah!",
              createdAt: selesai,
            },
          },
        },
      });

      // Sample chat message on completed order
      await prisma.chatMessage.createMany({
        data: [
          {
            orderId: createdOrder.id,
            senderRole: "DRIVER",
            senderId: driver.userId,
            senderNama: driver.nama,
            pesan: "Halo Kak, saya sudah meluncur ke titik jemput ya.",
            createdAt: diterima,
          },
          {
            orderId: createdOrder.id,
            senderRole: "PENUMPANG",
            senderId: penumpangOrder.id,
            senderNama: penumpangOrder.nama,
            pesan: "Siap Pak, saya sudah menunggu di dekat lobi.",
            createdAt: new Date(diterima.getTime() + 60 * 1000),
          },
        ],
      });
    }
  }

  // 10. Satu Order Aktif Siap Demo (Alun-Alun Majalengka -> Bunderan Munjul)
  const tarifDemo = 10400;
  const diskonDemo = 2080; // 20%
  const orderDemo = await prisma.order.create({
    data: {
      kode: `ORD-${formatTanggal(new Date())}-${String(urutan++).padStart(3, "0")}`,
      pangkalanId: pangkalan.id,
      penumpangId: userRina.id,
      jemputAlamat: "Alun-Alun Majalengka & Masjid Agung Al-Imam",
      jemputLat: -6.8362,
      jemputLng: 108.2281,
      tujuanAlamat: "Bunderan Munjul & Tugu Bola Dunia",
      tujuanLat: -6.8295,
      tujuanLng: 108.2198,
      jarakKm: 1.8,
      durasiMenit: 12,
      tarif: tarifDemo,
      promoId: promoSambutan.id,
      promoKode: promoSambutan.kode,
      diskon: diskonDemo,
      totalBayar: tarifDemo - diskonDemo,
      status: "MENCARI_DRIVER",
      simulationProgress: 0,
      createdAt: new Date(),
    },
  });

  console.log("Seed data realistis berhasil dibuat.");
  console.log(`Pangkalan: ${pangkalan.nama} (${POI_LIST.length} POI)`);
  console.log(`Promo aktif: ${promoSambutan.kode} (Diskon 20%)`);
  console.log(`Order aktif demo: ${orderDemo.kode}`);
  console.log("Akun demo (password: password123):");
  console.log("  Admin    : admin@becak.test");
  console.log("  Driver   : budi@becak.test, agus@becak.test, joko@becak.test, wawan@becak.test");
  console.log("  Penumpang: rina@becak.test (Onboarding Baru), dimas@becak.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
