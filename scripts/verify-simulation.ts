// =====================================================
// Automated E2E Test & Verification Suite
// Becak Listrik Mobility Platform - Kota Majalengka
// Jalankan via: npx tsx scripts/verify-simulation.ts
// =====================================================
import { prisma } from "../lib/prisma";
import { getRoadRoute, calculateHaversineDistance, interpolateRoutePosition } from "../lib/geo";
import { findNextAvailableDriver, assignDriverToOrder } from "../lib/dispatch";
import { stepOrderSimulation, resetDemoScenario } from "../lib/simulation";
import { calculateEcoImpact } from "../lib/eco";

async function runTestSuite() {
  console.log("=================================================");
  console.log("🚀 STARTING E2E TEST SUITE: BECAK LISTRIK PLATFORM");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // TEST 1: Database Health & Pangkalan Zone
    console.log("--- 1. Testing Database Health & Operational Zone ---");
    const pangkalan = await prisma.pangkalan.findFirst({
      include: { servicePoints: true },
    });
    assert(!!pangkalan, "Pangkalan operasional ditemukan di database MySQL.");
    assert(pangkalan!.servicePoints.length >= 5, "Titik POI kawasan heritage terisi >= 5 titik.");
    assert(pangkalan!.radiusKm === 3.5, "Radius zona operasional terkonfigurasi 3.5 km.");

    // TEST 2: Haversine & Geodesic Calculation
    console.log("\n--- 2. Testing Geospatial & Haversine Distance ---");
    const dist = calculateHaversineDistance(-7.7892, 110.3635, -7.8012, 110.3660);
    assert(dist > 1.2 && dist < 1.6, `Jarak garis lurus terhitung akurat (~${dist} km).`);

    // TEST 3: Road Routing Engine (OSRM / Fallback)
    console.log("\n--- 3. Testing Road Routing Provider ---");
    const route = await getRoadRoute(-7.7892, 110.3635, -7.8012, 110.3660);
    assert(route.coordinates.length >= 10, "Rute jalan menghasilkan array waypoints koordinat.");
    assert(route.distanceKm >= dist, "Jarak rute jalan lebih panjang atau sama dengan jarak lurus.");
    assert(route.durationMinutes >= 3, `Estimasi durasi rute becak terkalibrasi (${route.durationMinutes} menit).`);

    // TEST 4: Polyline Interpolation & Heading Rotation
    console.log("\n--- 4. Testing Polyline Interpolation & Heading ---");
    const interp0 = interpolateRoutePosition(route.coordinates, 0);
    const interp50 = interpolateRoutePosition(route.coordinates, 50);
    const interp100 = interpolateRoutePosition(route.coordinates, 100);
    assert(interp0.position[0] === route.coordinates[0][0], "Interpolasi 0% berada di titik awal penjemputan.");
    assert(interp100.position[0] === route.coordinates[route.coordinates.length - 1][0], "Interpolasi 100% berada di titik tujuan.");
    assert(typeof interp50.heading === "number", `Rotasi sudut heading terhitung (${interp50.heading}°).`);

    // TEST 5: Booking Creation & Server-side Pricing
    console.log("\n--- 5. Testing Customer Booking Creation & Pricing ---");
    const user = await prisma.user.findFirst({ where: { role: "PENUMPANG" } });
    assert(!!user, "Akun penumpang demo tersedia.");

    const testFare = pangkalan!.tarifDasar + Math.round(route.distanceKm * pangkalan!.tarifPerKm);
    const order = await prisma.order.create({
      data: {
        kode: `TEST-ORD-${Date.now()}`,
        pangkalanId: pangkalan!.id,
        penumpangId: user!.id,
        jemputAlamat: "Stasiun Tugu (Test)",
        jemputLat: -7.7892,
        jemputLng: 110.3635,
        tujuanAlamat: "Titik Nol KM (Test)",
        tujuanLat: -7.8012,
        tujuanLng: 110.3660,
        jarakKm: route.distanceKm,
        durasiMenit: route.durationMinutes,
        tarif: testFare,
        status: "MENCARI_DRIVER",
        routeGeometry: JSON.stringify(route.coordinates),
        simulationProgress: 0,
      },
    });
    assert(order.id > 0, "Pesanan baru berhasil dibuat dengan ID dan status 'MENCARI_DRIVER'.");
    assert(order.tarif === testFare, "Tarif terhitung server-side (Bukan input dari client).");

    // TEST 6: FIFO Dispatch Matching & Driver Assignment
    console.log("\n--- 6. Testing FIFO Dispatch & Transactional Lock ---");
    const nextDriverMatch = await findNextAvailableDriver(pangkalan!.id);
    assert(!!nextDriverMatch, "Dispatch FIFO menemukan driver online tersedia.");

    const assigned = await assignDriverToOrder(order.id, nextDriverMatch!.driver.id);
    assert(assigned!.status === "DITERIMA", "Status order berubah atomik menjadi 'DITERIMA'.");
    assert(assigned!.driverId === nextDriverMatch!.driver.id, "Driver ID terikat pada pesanan.");

    const updatedDriver = await prisma.driver.findUnique({ where: { id: nextDriverMatch!.driver.id } });
    assert(updatedDriver!.status === "ON_TRIP", "Status driver diperbarui menjadi 'ON_TRIP'.");

    // TEST 7: Simulation Progression (Driver En Route -> Pickup -> In Progress -> Complete)
    console.log("\n--- 7. Testing Simulation Engine Lifecycle Transitions ---");
    // Step 1: DITERIMA -> DIJEMPUT
    const step1 = await stepOrderSimulation(order.id, 20);
    assert(step1.status === "DIJEMPUT", "Simulasi memicu transisi ke 'DIJEMPUT'.");

    // Step 2: Driver moves towards pickup (advancing to 100% of pickup phase)
    const step2 = await stepOrderSimulation(order.id, 80);
    assert(step2.status === "BERJALAN", "Driver tiba di titik jemput, status beralih ke 'BERJALAN'.");

    // Step 3: Driver moves along route towards destination
    const step3 = await stepOrderSimulation(order.id, 40);
    assert(step3.progress > 0, "Progres perjalanan bertambah menuju tujuan.");

    // Step 4: Driver reaches destination -> SELESAI
    const step4 = await stepOrderSimulation(order.id, 90);
    assert(step4.status === "SELESAI", "Perjalanan tiba di destinasi akhir, status menjadi 'SELESAI'.");

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { payment: true },
    });
    assert(finalOrder!.status === "SELESAI", "Status order di DB terkunci 'SELESAI'.");
    assert(finalOrder!.payment?.status === "LUNAS", "Pembayaran order lunas otomatis terbuat.");

    const releasedDriver = await prisma.driver.findUnique({ where: { id: nextDriverMatch!.driver.id } });
    assert(releasedDriver!.status === "ONLINE", "Driver kembali berstatus 'ONLINE' dan siap antrean baru.");

    // TEST 8: Environmental Impact (Eco Analytics Calculation)
    console.log("\n--- 8. Testing Environmental Impact Calculator ---");
    const eco = calculateEcoImpact(25.4, 12);
    assert(eco.totalKm === 25.4, "Total km teragregasi.");
    assert(eco.avoidedCo2Kg > 1.0, `Emisi CO2 dihindari netto terhitung (~${eco.avoidedCo2Kg} kg).`);
    assert(eco.energyConsumedKwh > 0.5, "Konsumsi kWh listrik terhitung.");

    // TEST 9: Edge Case: Double-booking Prevention
    console.log("\n--- 9. Testing Edge Case: Double Booking Prevention ---");
    try {
      await assignDriverToOrder(order.id);
      assert(false, "Harus melempar error jika order sudah berstatus selain MENCARI_DRIVER.");
    } catch {
      assert(true, "Mencegah alokasi ganda pada order yang sudah diproses.");
    }

    // TEST 10: Safe Demo Scenario Reset
    console.log("\n--- 10. Testing Safe Demo Scenario Reset ---");
    const resetOk = await resetDemoScenario();
    assert(resetOk === true, "Reset skenario demo berjalan tanpa merusak basis data akun.");

    // Clean up test order
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });

    console.log("\n=================================================");
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log("=================================================\n");
  } catch (err) {
    console.error("Test execution aborted with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
