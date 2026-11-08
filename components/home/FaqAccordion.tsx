'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'LAYANAN PENUMPANG',
    question: 'Bagaimana cara memesan becak listrik di Kota Majalengka?',
    answer:
      'Cukup buka portal BecaKlik Majalengka di ponsel atau komputer Anda, pilih titik jemput dan tujuan di kawasan kota (seperti Alun-Alun, Bunderan Munjul, atau Pasar Mambo), selesaikan pembayaran via QRIS atau Tunai, dan armada dari pangkalan akan segera meluncur menjemput Anda dengan pelacakan peta langsung realtime.',
  },
  {
    category: 'TARIF & PEMBAYARAN',
    question: 'Apakah tarif becak listrik sudah pasti tanpa perlu tawar-menawar?',
    answer:
      'Ya, seluruh tarif dihitung otomatis secara transparan berdasarkan formula resmi pangkalan: tarif dasar Rp5.000 + Rp3.000/km perjalanan. Anda mengetahui jumlah pasti yang harus dibayar sebelum perjalanan dimulai.',
  },
  {
    category: 'KEAMANAN & KENYAMANAN',
    question: 'Apakah becak listrik aman saat hujan dan pada malam hari?',
    answer:
      'Sangat aman. Setiap unit becak listrik dilengkapi kanopi tahan air, pelindung angin, lampu depan LED penerangan tinggi, lampu sein, serta rem cakram ganda yang telah melalui uji kelaikan teknis pangkalan Majalengka.',
  },
  {
    category: 'LINGKUNGAN & TEKNOLOGI',
    question: 'Berapa jarak tempuh baterai becak listrik dan berapa emisi yang dihemat?',
    answer:
      'Setiap armada ditenagai baterai Lithium 48V dengan jangkauan hingga 45-50 km per pengisian penuh. Dengan mengonversi becak bertenaga kayuh berat atau sepeda motor bensin, setiap kilometer menghemat rata-rata 80 gram emisi karbon CO2 di udara Majalengka.',
  },
  {
    category: 'KEMITRAAN PENGEMUDI',
    question: 'Bagaimana pengemudi becak tradisional Majalengka bergabung menjadi mitra?',
    answer:
      'Pemerintah Daerah bersama koperasi pangkalan memberikan pendampingan konversi becak listrik gratis atau bersubsidi, pelatihan keselamatan berkendara, serta pembagian akun Mitra Driver yang mudah digunakan untuk menerima pesanan secara adil dan merata.',
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '36px auto 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: '#ffffff',
                border: isOpen ? '1px solid #0284c7' : '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: isOpen ? '0 8px 24px rgba(2, 132, 199, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)',
                transition: 'all 0.25s ease',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: isOpen ? '#f0f9ff' : '#f8fafc',
                      color: isOpen ? '#0284c7' : '#94a3b8',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 800,
                        color: isOpen ? '#0284c7' : '#94a3b8',
                        letterSpacing: '0.6px',
                        marginBottom: '2px',
                      }}
                    >
                      {item.category}
                    </span>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 700,
                        color: isOpen ? '#0f172a' : '#1e293b',
                      }}
                    >
                      {item.question}
                    </h4>
                  </div>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isOpen ? '#f0f9ff' : '#f8fafc',
                    color: isOpen ? '#0284c7' : '#64748b',
                    display: 'grid',
                    placeItems: 'center',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                    flexShrink: 0,
                  }}
                >
                  <ChevronDown size={18} />
                </div>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 24px 22px 64px',
                    color: '#475569',
                    fontSize: '14px',
                    lineHeight: '1.65',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} color="#0284c7" style={{ marginTop: '3px', flexShrink: 0 }} />
                    <p style={{ margin: 0 }}>{item.answer}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

