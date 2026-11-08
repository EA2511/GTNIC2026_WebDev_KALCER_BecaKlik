'use client';

import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  location: string;
  avatar: string;
  comment: string;
  rating: number;
  route: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Siti Rahmawati',
    role: 'Wisatawan Asal Bandung',
    location: 'Kunjungan Wisata Kuliner',
    avatar: 'SR',
    comment:
      'Luar biasa nyaman! Naik becak listrik keliling Alun-Alun dan Pasar Mambo tidak ada suara bising mesin sama sekali, sangat hening dan sejuk. Pengemudinya ramah sekali menjelaskan sejarah Majalengka sepanjang jalan.',
    rating: 5,
    route: 'Alun-Alun ➔ Pasar Mambo',
  },
  {
    name: 'H. Dedi Suhendar',
    role: 'Warga Majalengka Kulon',
    location: 'Pengguna Harian Pasar Tradisional',
    avatar: 'DS',
    comment:
      'Sangat terbantu untuk bepergian ke pasar setiap pagi. Tidak perlu capek tawar-menawar tarif lagi karena sudah tertera otomatis di HP. Becak listriknya stabil, ada kanopinya jadi teduh dari panas terik.',
    rating: 5,
    route: 'Jl. Abdul Halim ➔ Pasar Mambo',
  },
  {
    name: 'Rian Pratama',
    role: 'Fotografer & Content Creator',
    location: 'Ekplorasi Landmark Majalengka',
    avatar: 'RP',
    comment:
      'Spot foto di Bunderan Munjul keren banget, dan armadanya sendiri fotogenik dengan warna biru elektrik cerah. Keren banget Majalengka punya inovasi transportasi ramah lingkungan berkelas seperti ini!',
    rating: 5,
    route: 'Gedung Juang ➔ Bunderan Munjul',
  },
];

export default function TestimonialsSection() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginTop: '36px',
      }}
    >
      {TESTIMONIALS.map((t, idx) => (
        <div
          key={idx}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {/* Top quote icon */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              color: '#e0f2fe',
            }}
          >
            <Quote size={40} />
          </div>

          <div>
            {/* Stars */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
              {[...Array(t.rating)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>

            {/* Comment */}
            <p
              style={{
                fontSize: '14px',
                color: '#334155',
                lineHeight: '1.65',
                fontStyle: 'italic',
                margin: '0 0 20px 0',
                position: 'relative',
                zIndex: 2,
              }}
            >
              &ldquo;{t.comment}&rdquo;
            </p>
          </div>

          <div>
            {/* Route tag */}
            <div
              style={{
                display: 'inline-block',
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                marginBottom: '14px',
              }}
            >
              Rute: {t.route}
            </div>

            {/* User profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {t.avatar}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {t.name}
                  </h4>
                  <CheckCircle2 size={13} color="#0284c7" />
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {t.role} · {t.location}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
