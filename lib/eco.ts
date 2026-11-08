// =====================================================
// Modul Analisis Dampak Lingkungan (Eco Analytics)
// Standar Perhitungan: ESDM / IPCC Tier 1 (Simulasi Terkalibrasi)
// =====================================================

export interface EcoMetrics {
  totalKm: number;
  totalTrips: number;
  energyConsumedKwh: number;
  operationalCo2Kg: number;
  avoidedCo2Kg: number;
  gasolineSavedLiters: number;
  costSavingsRupiah: number;
  treeEquivalence: number;
  methodologyNote: string;
}

// Parameter Rujukan Ilmiah:
// 1. Sepeda Motor Bensin (ICE): ~95 gram CO2 / km, konsumsi bensin ~0.025 liter / km (40 km/liter)
// 2. Becak Listrik (EV Roda Tiga): ~0.035 kWh / km (motor 800W - 1000W efisiensi tinggi)
// 3. Faktor Emisi Grid Listrik Jawa-Madura-Bali (ESDM 2023): ~0.78 kg CO2 / kWh
// 4. Emisi Operasional Becak Listrik = 0.035 kWh/km * 0.78 kg CO2/kWh = ~0.0273 kg CO2/km (27.3 g CO2/km)
// 5. Emisi Dihindari Netto = 95 g - 27.3 g = 67.7 gram CO2 / km
// 6. 1 Pohon dewasa menyerap ~21.7 kg CO2 / tahun (~0.059 kg/hari)
const FACTOR_ICE_MOTOR_G_CO2_PER_KM = 95;
const FACTOR_BECAK_KWH_PER_KM = 0.035;
const FACTOR_GRID_KG_CO2_PER_KWH = 0.78;
const FACTOR_LITER_GASOLINE_PER_KM = 0.025;
const GASOLINE_PRICE_PER_LITER = 10000; // Pertalite Rp10.000 / liter

export function calculateEcoImpact(totalKm: number, totalTrips: number): EcoMetrics {
  const km = Math.max(0, totalKm);
  const trips = Math.max(0, totalTrips);

  const energyConsumedKwh = Number((km * FACTOR_BECAK_KWH_PER_KM).toFixed(2));
  const operationalCo2Kg = Number(
    ((energyConsumedKwh * FACTOR_GRID_KG_CO2_PER_KWH)).toFixed(2)
  );

  const baselineIceCo2Kg = (km * FACTOR_ICE_MOTOR_G_CO2_PER_KM) / 1000;
  const avoidedCo2Kg = Number(
    Math.max(0, baselineIceCo2Kg - operationalCo2Kg).toFixed(2)
  );

  const gasolineSavedLiters = Number((km * FACTOR_LITER_GASOLINE_PER_KM).toFixed(2));
  const costSavingsRupiah = Math.round(gasolineSavedLiters * GASOLINE_PRICE_PER_LITER);
  const treeEquivalence = Number((avoidedCo2Kg / 21.7).toFixed(1));

  return {
    totalKm: Number(km.toFixed(1)),
    totalTrips: trips,
    energyConsumedKwh,
    operationalCo2Kg,
    avoidedCo2Kg,
    gasolineSavedLiters,
    costSavingsRupiah,
    treeEquivalence,
    methodologyNote:
      "Dihitung dari selisih pemakaian becak listrik dibanding motor bensin untuk jarak tempuh yang sama di wilayah Majalengka.",
  };
}
