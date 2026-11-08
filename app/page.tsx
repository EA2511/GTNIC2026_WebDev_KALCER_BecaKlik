import Link from 'next/link';
import Image from 'next/image';
import { Zap, ArrowRight } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { BecakListrikHeroAnimation } from '@/components/home/BecakListrikHeroAnimation';
import MajalengkaLandmarkExplorer from '@/components/home/MajalengkaLandmarkExplorer';
import FaqAccordion from '@/components/home/FaqAccordion';
import TestimonialsSection from '@/components/home/TestimonialsSection';

export default function HomePage() {
  return (
    <main>
      {/* 1. ANIMASI HERO BECAK LISTRIK MAJALENGKA */}
      <BecakListrikHeroAnimation />

      {/* 2. STATS & LIVE PLATFORM IMPACT BAR */}
      <section
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '24px 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7' }}>1.420+ km</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Perjalanan Nol Emisi Majalengka</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0ea5e9' }}>96.5 kg</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Emisi Karbon CO₂ Terselamatkan</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0369a1' }}>4.95 / 5.0</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Indeks Kepuasan Wisatawan</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7' }}>100%</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Mitra Warga Lokal Majalengka</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE DESTINATION EXPLORER */}
      <section className="section section-soft" id="destinasi-majalengka">
        <div className="container">
          <SectionTitle
            eyebrow="DESTINASI HERITAGE & WISATA"
            title="Jelajah Pesona Majalengka Tanpa Polusi"
            description="Pilih landmark favorit Anda di kawasan pusat kota Majalengka dan nikmati perjalanan santai yang hening serta ramah lingkungan."
          />

          <MajalengkaLandmarkExplorer />
        </div>
      </section>

      {/* 4. CARA PEMESANAN & ALUR PERJALANAN 4 LANGKAH */}
      <section className="section section-soft" id="alur-pemesanan">
        <div className="container">
          <SectionTitle
            eyebrow="PENGALAMAN MUDAH & PRAKTIS"
            title="Cara Melakukan Perjalanan dengan Becak Listrik"
            description="Empat langkah sederhana untuk memesan, membayar, dan menikmati mobilitas keliling kota Majalengka."
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              marginTop: '36px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  marginBottom: '16px',
                  border: '1px solid #bae6fd',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                Pilih Rute & Detail
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                Tentukan lokasi penjemputan dan tujuan di Majalengka, jumlah penumpang, serta catatan penjemputan khusus.
              </p>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  marginBottom: '16px',
                  border: '1px solid #bae6fd',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                Bayar QRIS / Tunai
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                Selesaikan pembayaran digital via QRIS instan atau pilih tunai. Sistem mencatat transaksi aman tanpa biaya tersembunyi.
              </p>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  marginBottom: '16px',
                  border: '1px solid #bae6fd',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                Radar & Notifikasi Driver
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                Sistem radar pangkalan membunyikan notifikasi lonceng ke mitra driver terdekat untuk konfirmasi penjemputan kilat.
              </p>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  marginBottom: '16px',
                  border: '1px solid #bae6fd',
                }}
              >
                4
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                Pelacakan Peta Interaktif
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                Peta interaktif Leaflet langsung aktif menampilkan posisi becak listrik bergerak di jalan secara real-time seperti Grab.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS SECTION */}
      <section className="section" id="testimoni">
        <div className="container">
          <SectionTitle
            eyebrow="TESTIMONI & KEPUASAN PENGGUNA"
            title="Dipercaya Warga & Wisatawan Majalengka"
            description="Pengalaman nyata masyarakat dan wisatawan menjelajahi keindahan kota Majalengka dengan becak listrik hening."
          />

          <TestimonialsSection />
        </div>
      </section>

      {/* 7. FAQ ACCORDION SECTION */}
      <section className="section section-soft" id="faq">
        <div className="container">
          <SectionTitle
            eyebrow="PERTANYAAN UMUM (FAQ)"
            title="Hal yang Sering Ditanyakan"
            description="Informasi lengkap seputar operasional, keandalan baterai, tarif pangkalan, dan jaminan keselamatan becak listrik."
          />

          <FaqAccordion />
        </div>
      </section>

      {/* 8. BOTTOM CALL-TO-ACTION (CTA) BANNER */}
      <section
        style={{
          background: 'linear-gradient(135deg, #075985 0%, #0369a1 50%, #0284c7 100%)',
          color: '#ffffff',
          padding: '64px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Ambient Circles */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              marginBottom: '18px',
              color: '#e0f2fe',
            }}
          >
            <Zap size={14} fill="#38bdf8" color="#38bdf8" />
            EKOSISTEM MOBILITAS TERPADU KOTA MAJALENGKA
          </div>

          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              margin: '0 auto 16px',
              maxWidth: '720px',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            Wujudkan Mobilitas Hijau &amp; Bersih di Kota Majalengka
          </h2>

          <p
            style={{
              fontSize: '15px',
              color: '#e0f2fe',
              maxWidth: '620px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Nikmati transportasi ramah lingkungan berdaya baterai lithium tanpa polusi udara dan suara.
            Jelajahi keindahan Majalengka atau operasikan armada dengan teknologi terintegrasi.
          </p>

          {/* Action Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/login?role=pelanggan"
              className="button button-white"
              style={{
                padding: '15px 28px',
                fontSize: '15px',
                fontWeight: 800,
                borderRadius: '14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}
            >
              🚶‍♂️ Mulai Pesan Perjalanan <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark">
              <Image
                src="/logo-becaklik.png"
                alt="Logo BecaKlik"
                width={38}
                height={25}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </span>
            <span>
              Beca<span className="brand-light">Klik</span>
              <small>GREEN MOBILITY PLATFORM · MAJALENGKA 2026</small>
            </span>
          </Link>
          <p>
            BecaKlik — Sistem Manajemen Operasional &amp; Pemesanan Becak Listrik Kawasan Perkotaan Majalengka, Jawa Barat.
            Inisiatif Mobilitas Bersih &amp; Berkelanjutan.
          </p>
          <span className="footer-copy">
            © 2026 BecaKlik Majalengka · Inovasi Mobilitas Cerdas Berkelanjutan
          </span>
        </div>
      </footer>
    </main>
  );
}
