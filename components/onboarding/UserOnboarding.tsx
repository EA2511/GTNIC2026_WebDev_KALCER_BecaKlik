'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Tag,
  Bike,
  MessageSquare,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
} from 'lucide-react';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  {
    step: 1,
    title: 'Pilih Titik Penjemputan (A)',
    desc: 'Tentukan lokasi awal Anda. Anda dapat memilih dari titik populer seperti Alun-Alun Majalengka atau ketik patokan jemput Anda.',
    icon: <MapPin size={26} color="#0284c7" />,
    badge: 'LANGKAH 1 DARI 5',
    tip: 'Titik A ditandai dengan pin biru di koridor pusat kota Majalengka.',
  },
  {
    step: 2,
    title: 'Tentukan Destinasi Tujuan (B)',
    desc: 'Pilih lokasi destinasi tujuan seperti Bunderan Munjul & Tugu Bola Dunia, Gedung Juang, atau Taman Dirgantara.',
    icon: <Navigation size={26} color="#ea580c" />,
    badge: 'LANGKAH 2 DARI 5',
    tip: 'Titik B ditandai dengan pin oranye dengan estimasi jarak jalan dan durasi.',
  },
  {
    step: 3,
    title: 'Pilih dari 3 Voucher Promo Subsidi',
    desc: 'Tersedia 3 pilihan voucher: BECAKBARU (Diskon 20%), HIJAUMAJALENGKA (Subsidi Emisi 30%), dan UNMAHEMAT (Kampus & Warga 25%).',
    icon: <Tag size={26} color="#0284c7" />,
    badge: 'LANGKAH 3 DARI 5',
    tip: 'Klik salah satu chip voucher pada Langkah 4 di formulir untuk menerapkan diskon.',
  },
  {
    step: 4,
    title: 'Pantau Pergerakan Becak Listrik',
    desc: 'Setelah pesanan diterima mitra pangkalan, Anda dapat menyaksikan posisi becak listrik bergerak mengikuti kelokan jalan secara langsung di peta.',
    icon: <Bike size={26} color="#0284c7" />,
    badge: 'LANGKAH 4 DARI 5',
    tip: 'Dilengkapi estimasi waktu tiba (ETA) dan informasi daya baterai armada.',
  },
  {
    step: 5,
    title: 'Komunikasi In-App & Ulasan Layanan',
    desc: 'Kirim pesan instan langsung ke driver jika perlu koordinasi titik temu. Setelah sampai dengan selamat, berikan penilaian bintang untuk mitra pengemudi.',
    icon: <MessageSquare size={26} color="#0284c7" />,
    badge: 'LANGKAH 5 DARI 5',
    tip: 'Tersedia template pesan cepat satu ketukan tanpa repot mengetik.',
  },
];

export default function UserOnboarding({ isOpen, onClose, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(9, 30, 18, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          width: 'min(500px, 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #075985, #0284c7)',
            color: 'white',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panduan"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'grid',
              placeItems: 'center',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(56, 189, 248, 0.25)',
              border: '1px solid #38bdf8',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#38bdf8',
              marginBottom: '8px',
            }}
          >
            <Sparkles size={12} /> {current.badge}
          </div>

          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>
            Panduan Penggunaan BecaKlik
          </h2>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {current.icon}
            </div>

            <div>
              <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.55', margin: 0 }}>
                {current.desc}
              </p>
            </div>
          </div>

          {/* Tip Box */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '12px 14px',
              borderRadius: '10px',
              marginTop: '18px',
              fontSize: '12px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
            <span>{current.tip}</span>
          </div>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '22px 0 16px 0' }}>
            {steps.map((s, i) => (
              <span
                key={s.step}
                onClick={() => setCurrentStep(i)}
                style={{
                  width: i === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: i === currentStep ? '#0284c7' : '#cbd5e1',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: currentStep === 0 ? '#cbd5e1' : '#64748b',
                cursor: currentStep === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {!isLast && (
                <button
                  type="button"
                  onClick={onComplete}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '8px 12px',
                  }}
                >
                  Lewati
                </button>
              )}

              <button
                type="button"
                className="button button-primary"
                onClick={handleNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                }}
              >
                {isLast ? (
                  <>
                    Mulai Pesan <Zap size={16} />
                  </>
                ) : (
                  <>
                    Selanjutnya <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
