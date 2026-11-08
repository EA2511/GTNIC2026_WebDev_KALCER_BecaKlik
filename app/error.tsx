'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Zap, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Becak Listrik] Runtime error:', error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #bae6fd',
              boxShadow: '0 20px 60px rgba(2, 132, 199, 0.1)',
              padding: '48px 40px',
              textAlign: 'center',
              maxWidth: '480px',
              width: '100%',
            }}
          >
            {/* Brand */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '28px',
              }}
            >
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#0284c7',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Zap size={18} fill="currentColor" />
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Becak<span style={{ color: '#0284c7' }}>Listrik</span>
              </span>
            </div>

            {/* Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#fff7ed',
                border: '2px solid #fed7aa',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                fontSize: '36px',
              }}
            >
              ⚠️
            </div>

            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '5px 12px',
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 800,
                color: '#c2410c',
                letterSpacing: '0.6px',
                marginBottom: '14px',
              }}
            >
              TERJADI KENDALA TEKNIS
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}
            >
              Oops! Ada Gangguan Sementara
            </h1>

            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 28px' }}>
              Halaman ini mengalami kendala teknis yang tidak terduga. Muat ulang halaman atau
              kembali ke beranda untuk melanjutkan.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <RefreshCw size={16} />
                Muat Ulang Halaman
              </button>

              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  borderRadius: '12px',
                  padding: '14px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  width: '100%',
                }}
              >
                <Home size={16} />
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

