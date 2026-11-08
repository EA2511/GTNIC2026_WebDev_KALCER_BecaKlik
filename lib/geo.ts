// =====================================================
// Geospasial & Routing Engine: Becak Listrik Mobility Platform
// Abstraksi MapProvider & RoutingProvider dengan Fallback Cerdas
// =====================================================

export type LatLng = [number, number]; // [lat, lng]

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: LatLng[];
  provider: "osrm" | "simulated_road_network";
  summary?: string;
}

/**
 * Menghitung jarak garis lurus (Great Circle) menggunakan formula Haversine
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Menghitung arah rotasi sudut (bearing) dalam derajat (0 - 360°)
 * Digunakan agar marker Becak Listrik menghadap ke arah jalan
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Menghasilkan titik-titik penghalus kurva Bezier kuadratik untuk belokan jalan
 */
function sampleQuadraticBezier(
  p0: LatLng,
  p1: LatLng,
  p2: LatLng,
  steps: number
): LatLng[] {
  const result: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const lat = inv * inv * p0[0] + 2 * inv * t * p1[0] + t * t * p2[0];
    const lng = inv * inv * p0[1] + 2 * inv * t * p1[1] + t * t * p2[1];
    result.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return result;
}

/**
 * Meresample polyline menjadi titik-titik berjarak seragam agar animasi pergerakan mulus
 */
export function resamplePolylineUniform(
  points: LatLng[],
  targetCount = 40
): LatLng[] {
  if (!points || points.length < 2) return points || [];

  const cumDist: number[] = [0];
  let totalDist = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1]
    );
    totalDist += seg;
    cumDist.push(totalDist);
  }

  if (totalDist <= 1e-8) return [points[0], points[points.length - 1]];

  const uniform: LatLng[] = [];
  for (let k = 0; k <= targetCount; k++) {
    const targetD = (k / targetCount) * totalDist;
    let idx = 0;
    while (idx < cumDist.length - 2 && cumDist[idx + 1] < targetD) {
      idx++;
    }
    const segLen = cumDist[idx + 1] - cumDist[idx];
    const frac = segLen > 1e-9 ? (targetD - cumDist[idx]) / segLen : 0;
    const lat = points[idx][0] + (points[idx + 1][0] - points[idx][0]) * frac;
    const lng = points[idx][1] + (points[idx + 1][1] - points[idx][1]) * frac;
    uniform.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return uniform;
}

/**
 * Fallback koridor jalan realistis untuk Kawasan Majalengka (Poros Jl. KH. Abdul Halim)
 * Mengikuti struktur jalan raya Timur-Barat & penghubung Utara-Selatan tanpa garis zig-zag aneh
 */
export function generateRoadCorridorFallback(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): LatLng[] {
  const dLat = destLat - startLat;
  const dLng = destLng - startLng;

  // Poros utama Jl. KH. Abdul Halim berada di sekitar lat -6.8362
  const mainSpineLat = -6.8362;
  const distToSpineStart = Math.abs(startLat - mainSpineLat);
  const distToSpineDest = Math.abs(destLat - mainSpineLat);

  const rawWaypoints: LatLng[] = [[startLat, startLng]];

  // Jika rute melintasi kota secara horizontal (Timur-Barat), arahkan melewati koridor Jl. KH. Abdul Halim
  if (Math.abs(dLng) > 0.004 && (distToSpineStart < 0.012 || distToSpineDest < 0.012)) {
    const entryLng = startLng + dLng * 0.18;
    const exitLng = startLng + dLng * 0.82;
    const spineLat1 = startLat * 0.3 + mainSpineLat * 0.7;
    const spineLat2 = destLat * 0.3 + mainSpineLat * 0.7;

    const turn1 = sampleQuadraticBezier(
      [startLat, startLng],
      [spineLat1, startLng],
      [spineLat1, entryLng],
      8
    );
    const turn2 = sampleQuadraticBezier(
      [spineLat1, entryLng],
      [(spineLat1 + spineLat2) / 2, (entryLng + exitLng) / 2],
      [spineLat2, exitLng],
      12
    );
    const turn3 = sampleQuadraticBezier(
      [spineLat2, exitLng],
      [spineLat2, destLng],
      [destLat, destLng],
      8
    );

    rawWaypoints.push(...turn1.slice(1), ...turn2.slice(1), ...turn3.slice(1));
  } else {
    // Rute jarak dekat / antar lingkungan: kurva jalan L-street yang halus
    const cornerLat = startLat + dLat * 0.65;
    const cornerLng = startLng + dLng * 0.35;
    const smoothCurve = sampleQuadraticBezier(
      [startLat, startLng],
      [cornerLat, cornerLng],
      [destLat, destLng],
      24
    );
    rawWaypoints.push(...smoothCurve.slice(1));
  }

  return resamplePolylineUniform(rawWaypoints, 40);
}

/**
 * Menghasilkan rute pendekatan (approach) ~180 meter bagi driver menuju titik penjemputan (0% -> 20%)
 */
export function generatePickupApproachRoute(
  pickupLat: number,
  pickupLng: number,
  firstRoutePoint?: LatLng
): LatLng[] {
  // Titik awal driver sekitar 180m dari titik jemput pada koridor jalan
  const offsetLat = firstRoutePoint
    ? pickupLat - (firstRoutePoint[0] - pickupLat) * 0.6
    : pickupLat + 0.0012;
  const offsetLng = firstRoutePoint
    ? pickupLng - (firstRoutePoint[1] - pickupLng) * 0.6
    : pickupLng - 0.0015;

  const startLat =
    Math.abs(offsetLat - pickupLat) < 0.0005 ? pickupLat + 0.0011 : offsetLat;
  const startLng =
    Math.abs(offsetLng - pickupLng) < 0.0005 ? pickupLng - 0.0014 : offsetLng;

  return sampleQuadraticBezier(
    [startLat, startLng],
    [startLat, pickupLng],
    [pickupLat, pickupLng],
    12
  );
}

// Cache rute dalam memori agar pemilihan rute berulang berjalan instan (0ms)
const routeCache = new Map<string, RouteResult>();

/**
 * Abstraksi Routing: Mengambil rute jalan dari OSRM dengan Cache Instan & Fallback Cerdas
 */
export async function getRoadRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const straightDist = calculateHaversineDistance(
    startLat,
    startLng,
    destLat,
    destLng
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoordinates: LatLng[] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        // Resample agar pergerakan animasi becak berkecepatan konstan dan mulus di setiap tikungan
        const coordinates =
          rawCoordinates.length > 2
            ? resamplePolylineUniform(rawCoordinates, Math.max(45, rawCoordinates.length))
            : rawCoordinates;

        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMinutes = Math.max(
          3,
          Math.round((distanceKm / 15) * 60) // Kecepatan becak listrik rata-rata 15 km/jam
        );

        const result: RouteResult = {
          distanceKm,
          durationMinutes,
          coordinates,
          provider: "osrm",
          summary: route.legs?.[0]?.summary || "Rute OSRM OpenStreetMap",
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Layanan eksternal timeout atau offline: gunakan fallback koridor jalan instan
  }

  // Fallback realistis
  const coordinates = generateRoadCorridorFallback(
    startLat,
    startLng,
    destLat,
    destLng
  );
  // Jarak jalan biasanya ~1.25x jarak garis lurus
  const roadDist = Number(Math.max(0.6, straightDist * 1.25).toFixed(2));
  const duration = Math.max(3, Math.round((roadDist / 15) * 60));

  const fallbackResult: RouteResult = {
    distanceKm: roadDist,
    durationMinutes: duration,
    coordinates,
    provider: "simulated_road_network",
    summary: "Rute Koridor Jalan Kawasan Operasional (Simulasi Terkalibrasi)",
  };
  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Menginterpolasi posisi koordinat dan rotasi heading driver sepanjang polyline rute
 * berdasarkan panjang busur jalan (arc-length) agar kecepatan pergerakan 100% konstan
 */
export function interpolateRoutePosition(
  polyline: LatLng[],
  percentage: number
): {
  position: LatLng;
  heading: number;
  waypointIndex: number;
} {
  if (!polyline || polyline.length === 0) {
    return { position: [-6.8362, 108.2281], heading: 0, waypointIndex: 0 };
  }

  if (polyline.length === 1 || percentage <= 0) {
    const nextIdx = polyline.findIndex(
      (pt, i) => i > 0 && (pt[0] !== polyline[0][0] || pt[1] !== polyline[0][1])
    );
    const heading =
      nextIdx > 0
        ? calculateBearing(
            polyline[0][0],
            polyline[0][1],
            polyline[nextIdx][0],
            polyline[nextIdx][1]
          )
        : 0;
    return { position: polyline[0], heading, waypointIndex: 0 };
  }

  if (percentage >= 100) {
    const lastIdx = polyline.length - 1;
    let prevIdx = lastIdx - 1;
    while (
      prevIdx > 0 &&
      polyline[prevIdx][0] === polyline[lastIdx][0] &&
      polyline[prevIdx][1] === polyline[lastIdx][1]
    ) {
      prevIdx--;
    }
    const heading = calculateBearing(
      polyline[prevIdx][0],
      polyline[prevIdx][1],
      polyline[lastIdx][0],
      polyline[lastIdx][1]
    );
    return { position: polyline[lastIdx], heading, waypointIndex: lastIdx };
  }

  // Hitung panjang kumulatif tiap segmen
  const cumDist: number[] = [0];
  let totalDist = 0;
  for (let i = 1; i < polyline.length; i++) {
    const seg = Math.hypot(
      polyline[i][0] - polyline[i - 1][0],
      polyline[i][1] - polyline[i - 1][1]
    );
    totalDist += seg;
    cumDist.push(totalDist);
  }

  if (totalDist <= 1e-8) {
    return { position: polyline[0], heading: 0, waypointIndex: 0 };
  }

  const targetDist = (Math.max(0, Math.min(100, percentage)) / 100) * totalDist;
  let baseIdx = 0;
  while (baseIdx < cumDist.length - 2 && cumDist[baseIdx + 1] < targetDist) {
    baseIdx++;
  }

  const segLen = cumDist[baseIdx + 1] - cumDist[baseIdx];
  const fraction = segLen > 1e-9 ? (targetDist - cumDist[baseIdx]) / segLen : 0;

  const currentPoint = polyline[baseIdx];
  const nextPoint = polyline[Math.min(baseIdx + 1, polyline.length - 1)];

  const lat = currentPoint[0] + (nextPoint[0] - currentPoint[0]) * fraction;
  const lng = currentPoint[1] + (nextPoint[1] - currentPoint[1]) * fraction;

  // Cari titik berbeda terdekat untuk perhitungan sudut rotasi jalan yang stabil
  let lookAheadIdx = Math.min(baseIdx + 1, polyline.length - 1);
  while (
    lookAheadIdx < polyline.length - 1 &&
    Math.hypot(
      polyline[lookAheadIdx][0] - currentPoint[0],
      polyline[lookAheadIdx][1] - currentPoint[1]
    ) < 0.00005
  ) {
    lookAheadIdx++;
  }

  const heading = calculateBearing(
    currentPoint[0],
    currentPoint[1],
    polyline[lookAheadIdx][0],
    polyline[lookAheadIdx][1]
  );

  return {
    position: [Number(lat.toFixed(6)), Number(lng.toFixed(6))],
    heading,
    waypointIndex: baseIdx,
  };
}
