'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ArrowUpRight,
  HelpCircle,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import UserOnboarding from '@/components/onboarding/UserOnboarding';

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/login?role=pelanggan', label: 'Pesan Perjalanan' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('becak_sound_enabled');
      if (saved !== null) {
        const isEnabled = saved === 'true';
        Promise.resolve().then(() => {
          setSoundEnabled(isEnabled);
        });
      }
    }
  }, []);
  const pathname = usePathname();
  const isLoggedInPortal =
    pathname?.startsWith('/driver') ||
    pathname?.startsWith('/pelanggan') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login');

  const visibleNavLinks = isLoggedInPortal
    ? [{ href: '/', label: 'Beranda' }]
    : navLinks;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('becak_sound_enabled', String(next));
    }
  };

  return (
    <>
      {/* Top Banner: Status Pangkalan Majalengka */}
      <div
        style={{
          background: 'linear-gradient(90deg, #075985 0%, #0369a1 50%, #0284c7 100%)',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 700,
          padding: '6px 0',
          letterSpacing: '0.3px',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px #4ade80',
                flexShrink: 0,
              }}
            />
            <span style={{ wordBreak: 'break-word', minWidth: 0 }}>
              PANGKALAN ALUN-ALUN MAJALENGKA · 5 ARMADA BECAK LISTRIK SIAGA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <span style={{ color: '#bae6fd', wordBreak: 'break-word', minWidth: 0 }}>
              Kawasan Heritage Kota Majalengka
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="site-header">
        <div className="nav-wrap container">
          {/* Brand */}
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">
              <Image
                src="/logo-becaklik.png"
                alt="Logo BecaKlik"
                width={44}
                height={29}
                priority
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </span>
            <span>
              Beca<span className="brand-light">Klik</span>
              <small>MAJALENGKA MOBILITY · SMART HERITAGE</small>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className={`nav-links ${open ? 'nav-open' : ''}`}>
            {visibleNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link"
                  onClick={() => setOpen(false)}
                  style={{
                    color: isActive ? '#0284c7' : undefined,
                    fontWeight: isActive ? 800 : 600,
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Sound FX Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Matikan Suara Notifikasi' : 'Aktifkan Suara Notifikasi'}
              style={{
                background: 'none',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: soundEnabled ? '#0284c7' : '#94a3b8',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Tutorial Walkthrough Button */}
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                setShowTutorial(true);
                setOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#0284c7',
                fontWeight: 700,
              }}
            >
              <HelpCircle size={15} /> Panduan
            </button>

            {/* CTA Buttons (Hanya tampil di halaman publik/beranda, tidak tampil saat sudah login di Driver/Pelanggan/Admin) */}
            {!isLoggedInPortal && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/login"
                  className="nav-link"
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <User size={15} /> Masuk Akun
                </Link>

                <Link
                  href="/login?role=pelanggan"
                  className="button button-primary nav-cta"
                  onClick={() => setOpen(false)}
                >
                  Mulai Perjalanan <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu"
            aria-label="Buka menu navigasi"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Interactive Onboarding Tutorial Modal */}
      <UserOnboarding
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => setShowTutorial(false)}
      />
    </>
  );
}
