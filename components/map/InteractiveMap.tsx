'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap, LayerGroup, Polyline, Marker } from 'leaflet';
import { LocateFixed, Compass } from 'lucide-react';

export interface InteractiveMapProps {
  center?: [number, number];
  zoom?: number;
  pickupLocation?: [number, number] | null;
  pickupLabel?: string;
  destinationLocation?: [number, number] | null;
  destinationLabel?: string;
  routeCoordinates?: [number, number][];
  driverLocation?: [number, number] | null;
  driverHeading?: number;
  driverName?: string;
  driverUnit?: string;
  allDrivers?: Array<{
    id: number;
    nama: string;
    unit: string;
    lat: number;
    lng: number;
    heading: number;
    status: string;
  }>;
  servicePoints?: Array<{
    id: number;
    nama: string;
    kategori: string;
    alamat?: string;
    lat: number;
    lng: number;
    isDepot: boolean;
  }>;
  onSelectLocation?: (
    type: 'pickup' | 'destination',
    lat: number,
    lng: number,
    label?: string
  ) => void;
  selectionTarget?: 'pickup' | 'destination' | null;
  onTargetChange?: (target: 'pickup' | 'destination') => void;
  mode?: 'customer' | 'driver' | 'admin';
  interactivePick?: boolean;
  zoneRadiusKm?: number;
  height?: string;
  autoFitRoute?: boolean;
}

function areMapPropsEqual(prev: InteractiveMapProps, next: InteractiveMapProps): boolean {
  if (
    prev.height !== next.height ||
    prev.zoom !== next.zoom ||
    prev.pickupLabel !== next.pickupLabel ||
    prev.destinationLabel !== next.destinationLabel ||
    prev.driverHeading !== next.driverHeading ||
    prev.driverName !== next.driverName ||
    prev.driverUnit !== next.driverUnit ||
    prev.mode !== next.mode ||
    prev.interactivePick !== next.interactivePick ||
    prev.selectionTarget !== next.selectionTarget ||
    prev.zoneRadiusKm !== next.zoneRadiusKm ||
    prev.autoFitRoute !== next.autoFitRoute
  ) {
    return false;
  }

  const isCoordEqual = (c1?: [number, number] | null, c2?: [number, number] | null) => {
    if (!c1 && !c2) return true;
    if (!c1 || !c2) return false;
    return c1[0] === c2[0] && c1[1] === c2[1];
  };

  if (!isCoordEqual(prev.center, next.center)) return false;
  if (!isCoordEqual(prev.pickupLocation, next.pickupLocation)) return false;
  if (!isCoordEqual(prev.destinationLocation, next.destinationLocation)) return false;
  if (!isCoordEqual(prev.driverLocation, next.driverLocation)) return false;

  const prevRouteLen = prev.routeCoordinates?.length || 0;
  const nextRouteLen = next.routeCoordinates?.length || 0;
  if (prevRouteLen !== nextRouteLen) return false;
  if (prevRouteLen > 0 && prev.routeCoordinates && next.routeCoordinates) {
    const midIdx = Math.floor(prevRouteLen / 2);
    if (
      prev.routeCoordinates[0][0] !== next.routeCoordinates[0][0] ||
      prev.routeCoordinates[0][1] !== next.routeCoordinates[0][1] ||
      prev.routeCoordinates[midIdx]?.[0] !== next.routeCoordinates[midIdx]?.[0] ||
      prev.routeCoordinates[midIdx]?.[1] !== next.routeCoordinates[midIdx]?.[1] ||
      prev.routeCoordinates[prevRouteLen - 1][0] !== next.routeCoordinates[nextRouteLen - 1][0] ||
      prev.routeCoordinates[prevRouteLen - 1][1] !== next.routeCoordinates[nextRouteLen - 1][1]
    ) {
      return false;
    }
  }

  if ((prev.servicePoints?.length || 0) !== (next.servicePoints?.length || 0)) return false;
  if ((prev.allDrivers?.length || 0) !== (next.allDrivers?.length || 0)) return false;
  if (prev.allDrivers && next.allDrivers) {
    for (let i = 0; i < prev.allDrivers.length; i++) {
      const p = prev.allDrivers[i];
      const n = next.allDrivers[i];
      if (
        p.id !== n.id ||
        p.lat !== n.lat ||
        p.lng !== n.lng ||
        p.heading !== n.heading ||
        p.status !== n.status
      ) {
        return false;
      }
    }
  }

  return true;
}

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCoord(
  coord?: [number, number] | null,
  fallback: [number, number] | null = null
): [number, number] | null {
  if (
    Array.isArray(coord) &&
    coord.length === 2 &&
    typeof coord[0] === 'number' &&
    typeof coord[1] === 'number' &&
    !Number.isNaN(coord[0]) &&
    !Number.isNaN(coord[1]) &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  ) {
    return [coord[0], coord[1]];
  }
  return fallback;
}

function BaseInteractiveMap({
  center: rawCenter = [-6.8362, 108.2281],
  zoom = 15,
  pickupLocation: rawPickupLocation,
  pickupLabel = 'Titik Jemput',
  destinationLocation: rawDestinationLocation,
  destinationLabel = 'Tujuan',
  routeCoordinates,
  driverLocation: rawDriverLocation,
  driverHeading = 0,
  driverName,
  driverUnit = 'BL-001',
  allDrivers,
  servicePoints,
  onSelectLocation,
  selectionTarget = 'pickup',
  onTargetChange,
  mode = 'customer',
  interactivePick = false,
  zoneRadiusKm = 3.5,
  height = '460px',
  autoFitRoute = true,
}: InteractiveMapProps) {
  const center = sanitizeCoord(rawCenter, [-6.8362, 108.2281])!;
  const pickupLocation = sanitizeCoord(rawPickupLocation, null);
  const destinationLocation = sanitizeCoord(rawDestinationLocation, null);
  const driverLocation = sanitizeCoord(rawDriverLocation, null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [internalTarget, setInternalTarget] = useState<'pickup' | 'destination'>(
    selectionTarget || 'pickup'
  );

  const activeTarget = onTargetChange ? (selectionTarget || 'pickup') : internalTarget;

  // Refs untuk mencegah stale closure pada klik peta & POI
  const activeTargetRef = useRef<'pickup' | 'destination'>(activeTarget);
  const interactivePickRef = useRef<boolean>(interactivePick);
  const onSelectLocationRef = useRef(onSelectLocation);

  useEffect(() => {
    activeTargetRef.current = activeTarget;
    interactivePickRef.current = interactivePick;
    onSelectLocationRef.current = onSelectLocation;
  }, [activeTarget, interactivePick, onSelectLocation]);

  // Dedicated Layer Groups
  const poisLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const fleetLayerRef = useRef<LayerGroup | null>(null);

  // Persistent Marker & Polyline References for zero-flicker sub-millisecond updates
  const pickupMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);
  const driverHeadingRef = useRef<number>(0);
  const routePolylineRef = useRef<Polyline | null>(null);
  const routeGlowPolylineRef = useRef<Polyline | null>(null);
  const fleetMarkersMapRef = useRef<Map<number, Marker>>(new Map());
  const lastFittedKeyRef = useRef<string>('');

  // 1. Inisialisasi Peta Leaflet Langsung Tanpa Waterfall Delay
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    // Menggunakan tile resmi OpenStreetMap Standard yang bersih, bebas API Key, dan menampilkan jalan secara detail
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Lingkaran batas zona operasional pangkalan
    if (zoneRadiusKm) {
      L.circle(center, {
        radius: zoneRadiusKm * 1000,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Buat layer groups terisolasi
    poisLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    fleetLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    // Pastikan ukuran kanvas peta selalu mengisi penuh kotak kontainer tanpa sisa ruang putih
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 50);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 220);
    const t3 = setTimeout(() => map.invalidateSize({ animate: false }), 550);

    // Event Klik Peta untuk Pemilihan Titik (menggunakan ref agar selalu terbaru)
    map.on('click', (e) => {
      if (!interactivePickRef.current || !onSelectLocationRef.current) return;
      const target = activeTargetRef.current || 'pickup';
      const latNum = Number(e.latlng.lat.toFixed(6));
      const lngNum = Number(e.latlng.lng.toFixed(6));
      onSelectLocationRef.current(
        target,
        latNum,
        lngNum,
        target === 'pickup'
          ? `Titik Jemput Peta (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`
          : `Tujuan Peta (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`
      );
    });

    // ResizeObserver agar peta selalu responsif di semua ukuran layar & orientasi HP
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tombol Re-center Pangkalan / Rute
  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (routePolylineRef.current) {
      mapRef.current.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [45, 45],
        maxZoom: 16,
      });
    } else {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  };

  // Tombol Lokasi Pengguna
  const handleLocateMe = () => {
    if (!mapRef.current) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return;
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          mapRef.current.setView([userLat, userLng], 16, { animate: true });
          if (interactivePickRef.current && onSelectLocationRef.current) {
            onSelectLocationRef.current(
              activeTargetRef.current || 'pickup',
              userLat,
              userLng,
              'Lokasi Terkini Saya'
            );
          }
        },
        () => {
          handleRecenter();
        },
        { timeout: 3500 }
      );
    } else {
      handleRecenter();
    }
  };

  // 2. Render POIs / Titik Layanan Wisata & Pangkalan
  useEffect(() => {
    const poisGroup = poisLayerRef.current;
    if (!mapReady || !poisGroup) return;

    poisGroup.clearLayers();

    if (!servicePoints || servicePoints.length === 0) return;

    servicePoints.forEach((poi) => {
      const isSelected =
        (pickupLocation &&
          Math.abs(pickupLocation[0] - poi.lat) < 0.0003 &&
          Math.abs(pickupLocation[1] - poi.lng) < 0.0003) ||
        (destinationLocation &&
          Math.abs(destinationLocation[0] - poi.lat) < 0.0003 &&
          Math.abs(destinationLocation[1] - poi.lng) < 0.0003);

      if (isSelected) return;

      const iconHtml = `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${poi.isDepot ? '#075985' : '#ffffff'};
          color: ${poi.isDepot ? '#38bdf8' : '#0284c7'};
          border: 2px solid ${poi.isDepot ? '#38bdf8' : '#0284c7'};
          box-shadow: 0 3px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${poi.isDepot ? '⚡' : '●'}
        </div>
      `;

      const poiMarker = L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({
          className: 'poi-compact-pin',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });

      poiMarker.bindTooltip(
        `<strong>${poi.nama}</strong><br/><small>${poi.isDepot ? 'Pangkalan Utama' : poi.kategori} · Klik untuk pilih</small>`,
        { direction: 'top', offset: [0, -10] }
      );

      poiMarker.on('click', () => {
        if (interactivePickRef.current && onSelectLocationRef.current) {
          onSelectLocationRef.current(
            activeTargetRef.current || 'pickup',
            poi.lat,
            poi.lng,
            poi.nama
          );
        }
      });

      poisGroup.addLayer(poiMarker);
    });
  }, [mapReady, servicePoints, pickupLocation, destinationLocation]);

  // 3. Render / Update Polyline Rute Perjalanan
  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayerRef.current;
    if (!mapReady || !map || !routeGroup) return;

    if (!routeCoordinates || routeCoordinates.length < 2) {
      routeGroup.clearLayers();
      routePolylineRef.current = null;
      routeGlowPolylineRef.current = null;
      return;
    }

    if (routePolylineRef.current && routeGlowPolylineRef.current) {
      routePolylineRef.current.setLatLngs(routeCoordinates);
      routeGlowPolylineRef.current.setLatLngs(routeCoordinates);
    } else {
      routeGroup.clearLayers();

      const polyline = L.polyline(routeCoordinates, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.92,
        lineJoin: 'round',
        lineCap: 'round',
      });
      polyline.addTo(routeGroup);
      routePolylineRef.current = polyline;

      const polylineGlow = L.polyline(routeCoordinates, {
        color: '#38bdf8',
        weight: 2.5,
        dashArray: '6, 12',
        opacity: 0.95,
      });
      polylineGlow.addTo(routeGroup);
      routeGlowPolylineRef.current = polylineGlow;
    }

    const firstPt = routeCoordinates[0];
    const lastPt = routeCoordinates[routeCoordinates.length - 1];
    const routeKey = `${routeCoordinates.length}-${firstPt?.[0]}-${firstPt?.[1]}-${lastPt?.[0]}-${lastPt?.[1]}`;
    if (autoFitRoute && lastFittedKeyRef.current !== routeKey && routePolylineRef.current) {
      lastFittedKeyRef.current = routeKey;
      const bounds = routePolylineRef.current.getBounds();
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [mapReady, routeCoordinates, autoFitRoute]);

  // 4. Render / Update Marker Penjemputan (Pin A) dan Tujuan (Pin B) beserta Label Dinamis
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!mapReady || !markersGroup) return;

    const buildPinIcon = (letter: 'A' | 'B', color: string, shadowRgba: string, label: string) =>
      L.divIcon({
        className: letter === 'A' ? 'pickup-marker-pin' : 'dest-marker-pin',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="
              background: ${color};
              color: #ffffff;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px ${shadowRgba};
              border: 2px solid #ffffff;
            ">
              <span style="transform: rotate(45deg); font-weight: 800; font-size: 14px;">${letter}</span>
            </div>
            <div class="marker-pin-label" style="
              background: rgba(15, 23, 42, 0.92);
              color: white;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 6px;
              margin-top: 4px;
              white-space: nowrap;
              max-width: 165px;
              overflow: hidden;
              text-overflow: ellipsis;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              border: 1px solid rgba(255,255,255,0.2);
            ">${escapeHtml(label)}</div>
          </div>
        `,
        iconSize: [170, 56],
        iconAnchor: [85, 32],
      });

    // Pin Penjemputan (Pin A)
    if (pickupLocation) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng(pickupLocation);
        pickupMarkerRef.current.setIcon(
          buildPinIcon('A', '#0284c7', 'rgba(2,132,199,0.4)', pickupLabel)
        );
      } else {
        const m = L.marker(pickupLocation, {
          icon: buildPinIcon('A', '#0284c7', 'rgba(2,132,199,0.4)', pickupLabel),
          zIndexOffset: 800,
        });
        m.addTo(markersGroup);
        pickupMarkerRef.current = m;
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // Pin Tujuan (Pin B)
    if (destinationLocation) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng(destinationLocation);
        destMarkerRef.current.setIcon(
          buildPinIcon('B', '#ea580c', 'rgba(234,88,12,0.4)', destinationLabel)
        );
      } else {
        const m = L.marker(destinationLocation, {
          icon: buildPinIcon('B', '#ea580c', 'rgba(234,88,12,0.4)', destinationLabel),
          zIndexOffset: 800,
        });
        m.addTo(markersGroup);
        destMarkerRef.current = m;
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [mapReady, pickupLocation, pickupLabel, destinationLocation, destinationLabel]);

  // 5. ULTRA-FAST SUB-MILLISECOND UPDATE: Marker Becak Listrik Aktif
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!mapReady || !markersGroup) return;

    if (!driverLocation) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(driverLocation);
      const el = driverMarkerRef.current.getElement();
      const arrow = el?.querySelector<HTMLElement>('.active-becak-compass');
      if (arrow && typeof driverHeading === 'number') {
        const currentAngle = driverHeadingRef.current || 0;
        // Hitung selisih sudut terkecil (-180 s/d +180) agar rotasi kompas selalu mengambil jalur terpendek tanpa muter 360 derajat
        const diff = (((driverHeading - currentAngle) % 360) + 540) % 360 - 180;
        const targetAngle = currentAngle + diff;
        arrow.style.transform = `rotate(${targetAngle}deg)`;
        driverHeadingRef.current = targetAngle;
      }
    } else {
      const vehicleHtml = `
        <div style="
          position: relative;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            inset: 0;
            background: rgba(56, 189, 248, 0.35);
            border-radius: 50%;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: absolute;
            inset: 4px;
            background: rgba(2, 132, 199, 0.2);
            border-radius: 50%;
            border: 1.5px solid #38bdf8;
          "></div>
          <div class="active-becak-compass" style="
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0284c7, #0369a1);
            border: 2.5px solid #ffffff;
            box-shadow: 0 8px 24px rgba(2,132,199,0.65), 0 0 12px #38bdf8;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${driverHeading}deg);
            transition: transform 0.45s ease-out;
            position: relative;
            z-index: 2;
          ">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <!-- Sorot Lampu Depan LED -->
              <path d="M12 6 L9 1 L23 1 L20 6 Z" fill="rgba(186, 230, 253, 0.55)" />
              <!-- Roda Kemudi Depan -->
              <rect x="14" y="4" width="4" height="5" rx="2" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
              <!-- Roda Samping Kiri & Kanan -->
              <rect x="5" y="15" width="3" height="8" rx="1.5" fill="#0f172a" />
              <rect x="24" y="15" width="3" height="8" rx="1.5" fill="#0f172a" />
              <!-- Kabin & Kanopi Becak Listrik -->
              <rect x="8" y="9" width="16" height="17" rx="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" />
              <!-- Kaca Depan Panorama -->
              <path d="M10 12 Q16 9.5 22 12 L21 15 L11 15 Z" fill="#0c4a6e" />
              <!-- Panel Surya Atap -->
              <rect x="11" y="16.5" width="10" height="6.5" rx="2" fill="#0284c7" stroke="#bae6fd" stroke-width="1" />
              <!-- Indikator Arah Maju -->
              <polygon points="16,5 19,8.5 13,8.5" fill="#fde047" />
            </svg>
          </div>
          <div style="
            position: absolute;
            top: -16px;
            background: #0f172a;
            color: #38bdf8;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            border: 1px solid #38bdf8;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            z-index: 10;
            letter-spacing: 0.3px;
          ">
            ⚡ ${escapeHtml(driverUnit)}
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'active-becak-marker',
        html: vehicleHtml,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      const vMarker = L.marker(driverLocation, {
        icon: vehicleIcon,
        zIndexOffset: 1200,
      });

      if (driverName) {
        vMarker.bindPopup(`
          <div style="font-family:sans-serif;padding:4px">
            <strong>${escapeHtml(driverName)}</strong>
            <div style="font-size:12px;color:#0284c7;font-weight:600">Unit: ${escapeHtml(driverUnit)} (Becak Listrik)</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">● Telemetri Rute Aktif</div>
          </div>
        `);
      }

      vMarker.addTo(markersGroup);
      driverMarkerRef.current = vMarker;
      driverHeadingRef.current = driverHeading;
    }
  }, [mapReady, driverLocation, driverHeading, driverName, driverUnit]);

  // 6. Mode Admin: Update Armada Driver
  useEffect(() => {
    const fleetGroup = fleetLayerRef.current;
    if (!mapReady || !fleetGroup) return;

    if (mode !== 'admin' || !allDrivers || allDrivers.length === 0) {
      fleetGroup.clearLayers();
      fleetMarkersMapRef.current.clear();
      return;
    }

    const currentMap = fleetMarkersMapRef.current;
    const incomingIds = new Set<number>();

    allDrivers.forEach((d) => {
      if (!d || typeof d.lat !== 'number' || typeof d.lng !== 'number' || isNaN(d.lat) || isNaN(d.lng)) {
        return;
      }
      incomingIds.add(d.id);
      const isTrip = d.status === 'ON_TRIP' || d.status === 'Dalam perjalanan';
      const isOnline = d.status === 'ONLINE' || d.status === 'Online';
      const color = isTrip ? '#0ea5e9' : isOnline ? '#0284c7' : '#64748b';
      const stroke = isTrip ? '#38bdf8' : isOnline ? '#7dd3fc' : '#cbd5e1';

      const existingMarker = currentMap.get(d.id);
      if (existingMarker) {
        existingMarker.setLatLng([d.lat, d.lng]);
        const el = existingMarker.getElement();
        const iconDiv = el?.querySelector<HTMLElement>('.fleet-heading-arrow');
        if (iconDiv) {
          iconDiv.style.transform = `rotate(${d.heading}deg)`;
          iconDiv.style.background = color;
          iconDiv.style.borderColor = stroke;
        }
      } else {
        const icon = L.divIcon({
          className: 'admin-fleet-pin',
          html: `
            <div class="fleet-heading-arrow" style="
              background: ${color};
              border: 2px solid ${stroke};
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              transform: rotate(${d.heading}deg);
              transition: transform 0.3s ease;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const m = L.marker([d.lat, d.lng], { icon });
        m.bindPopup(`
          <div style="font-family:sans-serif;padding:3px">
            <strong>${escapeHtml(d.nama)} (${escapeHtml(d.unit)})</strong>
            <div style="font-size:12px;color:${color};font-weight:600">Status: ${d.status}</div>
          </div>
        `);
        m.addTo(fleetGroup);
        currentMap.set(d.id, m);
      }
    });

    currentMap.forEach((marker, id) => {
      if (!incomingIds.has(id)) {
        marker.remove();
        currentMap.delete(id);
      }
    });
  }, [mapReady, mode, allDrivers]);

  const handleSwitchTarget = (nextTarget: 'pickup' | 'destination') => {
    setInternalTarget(nextTarget);
    if (onTargetChange) {
      onTargetChange(nextTarget);
    }
  };

  return (
    <div
      className="responsive-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height,
        flex: 1,
        minHeight: '340px',
        overflow: 'hidden',
        background: '#e0f2fe',
        display: 'block',
      }}
    >
      {/* Peta Leaflet Container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: '340px' }}
      />

      {/* Floating Map Navigation Controls (Top Right) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          type="button"
          onClick={handleRecenter}
          title="Pusatkan Peta ke Rute / Kawasan Operasional"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            cursor: 'pointer',
          }}
        >
          <Compass size={18} />
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          title="Lokasi Terkini Saya"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            cursor: 'pointer',
          }}
        >
          <LocateFixed size={18} />
        </button>
      </div>

      {/* Mode Pemilihan Titik Switcher (Top Left) - 1-Klik Ganti Titik A / Titik B */}
      {interactivePick && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            right: 54,
            zIndex: 1000,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '4px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
              pointerEvents: 'auto',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => handleSwitchTarget('pickup')}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                background: activeTarget === 'pickup' ? '#0284c7' : 'transparent',
                color: activeTarget === 'pickup' ? '#ffffff' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: activeTarget === 'pickup' ? '#ffffff' : '#38bdf8',
                }}
              />
              Pilih Jemput (A)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTarget('destination')}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                background: activeTarget === 'destination' ? '#ea580c' : 'transparent',
                color: activeTarget === 'destination' ? '#ffffff' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: activeTarget === 'destination' ? '#ffffff' : '#fb923c',
                }}
              />
              Pilih Tujuan (B)
            </button>
          </div>
        </div>
      )}

      {/* Attribution & Status Badge (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          right: 6,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.92)',
          color: '#475569',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 700,
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        © OpenStreetMap · Kawasan Majalengka
      </div>
    </div>
  );
}

const InteractiveMap = memo(BaseInteractiveMap, areMapPropsEqual);
export default InteractiveMap;
