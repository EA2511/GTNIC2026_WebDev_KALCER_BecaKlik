import Link from 'next/link';
import Image from 'next/image';
import { Home, Users, Bike, ShieldCheck, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          border: '1px solid #bae6fd',
          boxShadow: '0 20px 60px rgba(2, 132, 199, 0.12)',
          padding: '56px 48px',
          textAlign: 'center',
          maxWidth: '560px',
          width: '100%',
        }}
      >
        {/* Logo Brand */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            marginBottom: '32px',
          }}
        >
          <span className="brand-mark">
            <Image
              src="/logo-becaklik.png"
              alt="Logo BecaKlik"
              width={44}
              height={29}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Beca<span style={{ color: '#0284c7' }}>Klik</span>
          </span>
        </Link>

        {/* 404 Illustration */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #bae6fd',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 24px',
          }}
        >
          <span style={{ fontSize: '44px', lineHeight: 1 }}>🛺</span>
        </div>

        {/* Error Info */}
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '6px 14px',
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#0284c7',
            letterSpacing: '0.6px',
            marginBottom: '16px',
          }}
        >
          ERROR 404 · HALAMAN TIDAK DITEMUKAN
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}
        >
          Becak Kesasar Rute!
        </h1>

        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', margin: '0 0 36px' }}>
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          Gunakan navigasi di bawah untuk kembali ke jalur yang benar.
        </p>

        {/* Quick Access to All 3 Portals */}
        <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '14px 20px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Home size={18} />
              Kembali ke Beranda
            </div>
            <ArrowRight size={16} />
          </Link>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <Link
              href="/login?role=pelanggan"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0284c7',
                borderRadius: '12px',
                padding: '12px 8px',
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              <Users size={20} />
              Penumpang
            </Link>
            <Link
              href="/login?role=driver"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                color: '#0369a1',
                borderRadius: '12px',
                padding: '12px 8px',
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              <Bike size={20} />
              Mitra Driver
            </Link>
            <Link
              href="/login?role=admin"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#0369a1',
                borderRadius: '12px',
                padding: '12px 8px',
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              <ShieldCheck size={20} />
              Admin Ops
            </Link>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
          BecaKlik Majalengka · Platform Mobilitas Hijau 2026
        </p>
      </div>
    </main>
  );
}

