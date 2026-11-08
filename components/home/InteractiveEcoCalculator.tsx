'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Leaf, Zap, ShieldCheck, Fuel, TrendingUp } from 'lucide-react';

const money = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

export default function InteractiveEcoCalculator() {
  const [distanceKm, setDistanceKm] = useState<number>(2.0);

  // Perhitungan Transparan
  // Tarif dasar: Rp5.000 + (Rp3.000 * km)
  const fare = Math.round(5000 + distanceKm * 3000);
  
  // Emisi motor bensin konvensional: ~110 g CO2/km
  // Becak listrik baterai lithium: ~30 g CO2/km (efisiensi grid PLN)
  // Penghematan netto: ~80 g CO2/km
  const co2SavedGram = Math.round(distanceKm * 80);
  
  // Konsumsi bensin motor rata-rata 1L / 35 km -> BBM dihemat
  const fuelSavedMl = Math.round((distanceKm / 35) * 1000);

  // Estimasi durasi (kecepatan santai 15 km/jam)
  const durationMinutes = Math.max(3, Math.round((distanceKm / 15) * 60));

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)',
        borderRadius: '24px',
        padding: '36px',
        color: '#ffffff',
        boxShadow: '0 20px 45px rgba(2, 132, 199, 0.22)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.3)',
      }}
    >
      {/* Background Decorative Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Zap size={13} fill="#38bdf8" /> KALKULATOR TARIF & DAMPAK LINGKUNGAN
          </span>
        </div>

        <h3
          style={{
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 10px 0',
            color: '#ffffff',
            letterSpacing: '-0.5px',
          }}
        >
          Hitung Estimasi Biaya & Emisi Bersih Majalengka
        </h3>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '0 0 28px', maxWidth: '650px', lineHeight: '1.5' }}>
          Geser jarak perjalanan Anda di pusat Kota Majalengka untuk melihat transparansi tarif resmi serta kontribusi pengurangan polusi udara secara langsung.
        </p>

        {/* Distance Slider Control */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '18px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Jarak Perjalanan
              </span>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>
                {distanceKm.toFixed(1)} <span style={{ fontSize: '18px', color: '#e0f2fe' }}>km</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Estimasi Waktu Tempuh</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                ± {durationMinutes} Menit Santai
              </div>
            </div>
          </div>

          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={distanceKm}
            aria-label="Jarak perjalanan dalam kilometer"
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              accentColor: '#38bdf8',
              cursor: 'pointer',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#94a3b8',
              fontWeight: 600,
              marginTop: '8px',
            }}
          >
            <span>0.5 km (Pasar Mambo)</span>
            <span>2.5 km (Pusat Kota)</span>
            <span>5.0 km (Batas Zona Layanan)</span>
          </div>
        </div>

        {/* Results Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* Box 1: Tarif Resmi */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '8px' }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>TARIF RESMI FLAT</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              {money(fare)}
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              Tanpa tawar-menawar di jalan
            </span>
          </div>

          {/* Box 2: Emisi Karbon Terhemat */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', marginBottom: '8px' }}>
              <Leaf size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>CO₂ TERHEMAT</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              ~{co2SavedGram} <span style={{ fontSize: '16px', fontWeight: 600, color: '#86efac' }}>gram</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              Vs motor bensin konvensional
            </span>
          </div>

          {/* Box 3: Penghematan Bahan Bakar */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '8px' }}>
              <Fuel size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>BBM TERHINDAR</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              {fuelSavedMl} <span style={{ fontSize: '16px', fontWeight: 600, color: '#fde68a' }}>mL</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              Bensin fosil terselamatkan
            </span>
          </div>

          {/* Box 4: Dampak Pengemudi */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', marginBottom: '8px' }}>
              <TrendingUp size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>BAGI HASIL MITRA</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              90%
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              Langsung ke pengemudi lokal
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href="/login?role=pelanggan"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 20px rgba(14, 165, 233, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Pesan Perjalanan Jarak Ini ({distanceKm.toFixed(1)} km) <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}

