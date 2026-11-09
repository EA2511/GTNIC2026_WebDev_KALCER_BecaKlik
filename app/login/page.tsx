'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Phone,
  Bike,
  Sparkles,
} from 'lucide-react';

const DEMO_PERSONAS = [
  {
    role: 'PENUMPANG',
    name: 'Rina Kusuma',
    email: 'rina@becak.test',
    label: 'Penumpang',
    badge: 'Wisatawan / Warga',
    icon: <User size={16} />,
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  {
    role: 'DRIVER',
    name: 'Budi Santoso',
    email: 'budi@becak.test',
    label: 'Mitra Driver',
    badge: 'Armada BL-001',
    icon: <Bike size={16} />,
    color: '#0ea5e9',
    bg: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  {
    role: 'ADMIN',
    name: 'Pak Slamet',
    email: 'admin@becak.test',
    label: 'Admin Ops',
    badge: 'Pusat Kendali',
    icon: <ShieldCheck size={16} />,
    color: '#0369a1',
    bg: '#eff6ff',
    borderColor: '#bfdbfe',
  },
];

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const modeParam = searchParams.get('mode');
  const tujuanParam = searchParams.get('tujuan');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  function buildRedirectUrl(basePath: string) {
    if (basePath === '/pelanggan' && tujuanParam) {
      const params = new URLSearchParams();
      params.set('tujuan', tujuanParam);
      if (latParam) params.set('lat', latParam);
      if (lngParam) params.set('lng', lngParam);
      return `/pelanggan?${params.toString()}`;
    }
    return basePath;
  }

  const initialEmail =
    roleParam === 'driver'
      ? 'budi@becak.test'
      : roleParam === 'admin'
      ? 'admin@becak.test'
      : 'rina@becak.test';

  const [authMode, setAuthMode] = useState<'login' | 'register'>(
    modeParam === 'register' ? 'register' : 'login'
  );

  // Login states
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Register states (New Passenger Account)
  const [regNama, setRegNama] = useState('');
  const [regNoHp, setRegNoHp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function performLogin(targetEmail: string, targetPass: string) {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.message || 'Email atau kata sandi tidak sesuai.');
        return;
      }

      if (typeof window !== 'undefined') {
        if (result.user) {
          localStorage.setItem(
            'becak_custom_passenger',
            JSON.stringify({
              nama: result.user.nama,
              email: result.user.email,
              noHp: result.user.noHp || '',
            })
          );
        } else {
          localStorage.removeItem('becak_custom_passenger');
        }
      }

      if (result.redirectTo) {
        router.replace(buildRedirectUrl(result.redirectTo));
        router.refresh();
      }
    } catch {
      setError('Tidak dapat terhubung ke server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(email, password);
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: regNama,
          noHp: regNoHp || '081200000000',
          email: regEmail,
          password: regPassword,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.message || 'Gagal mendaftarkan akun baru.');
        return;
      }

      if (typeof window !== 'undefined' && result.user) {
        localStorage.setItem(
          'becak_custom_passenger',
          JSON.stringify({
            nama: result.user.nama,
            email: result.user.email,
            noHp: result.user.noHp,
          })
        );
      }

      router.replace(buildRedirectUrl(result.redirectTo || '/pelanggan'));
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectDemoPersona(personaEmail: string) {
    setAuthMode('login');
    setEmail(personaEmail);
    setPassword('password123');
    await performLogin(personaEmail, 'password123');
  }

  return (
    <main className="login-page">
      <section className="login-card" style={{ maxWidth: '470px', width: '100%' }}>
        <Link href="/" className="login-back">
          <ArrowLeft size={16} />
          Kembali ke beranda
        </Link>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link
            href="/"
            className="brand login-brand"
            style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
          >
            <span className="brand-mark">
              <Image
                src="/logo-becaklik.png"
                alt="Logo BecaKlik"
                width={54}
                height={35}
                priority
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </span>
            <span style={{ textAlign: 'left' }}>
              Beca<span className="brand-light">Klik</span>
              <small style={{ display: 'block', fontSize: '9px', letterSpacing: '1px', color: '#64748b', fontWeight: 700, marginTop: '3px' }}>
                MAJALENGKA MOBILITY PLATFORM
              </small>
            </span>
          </Link>

          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '14px 0 6px', color: '#0f172a' }}>
            {authMode === 'login' ? 'Portal Masuk BecaKlik' : 'Daftar Akun Penumpang Baru'}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {authMode === 'login'
              ? 'Masuk dengan akun terdaftar atau buat akun penumpang baru secara instan.'
              : 'Buat akun baru dalam 10 detik untuk mulai memesan di BecaKlik Majalengka.'}
          </p>
        </div>

        {/* Mode Switcher Tabs: Masuk vs Daftar Akun Baru */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: '#f1f5f9',
            padding: '5px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError('');
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'login' ? '#ffffff' : 'transparent',
              color: authMode === 'login' ? '#0284c7' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: authMode === 'login' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <User size={15} />
            <span>Masuk Akun</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError('');
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'register' ? '#ffffff' : 'transparent',
              color: authMode === 'register' ? '#0284c7' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: authMode === 'register' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={15} />
            <span>Buat Akun Baru</span>
          </button>
        </div>

        {authMode === 'login' ? (
          /* Unified Login Form */
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Email Akun
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={1024}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary button-large"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                padding: '13px',
              }}
            >
              {loading ? 'Memverifikasi Akun...' : 'Masuk ke Platform'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* New Passenger Registration Form */
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div style={{ textAlign: 'left', marginBottom: '12px' }}>
              <label
                htmlFor="regNama"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Nama Lengkap Penumpang
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#0284c7"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="regNama"
                  type="text"
                  placeholder="Contoh: Dimas Pratama"
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '12px' }}>
              <label
                htmlFor="regNoHp"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Nomor WhatsApp / HP Aktif
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  color="#0284c7"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="regNoHp"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={regNoHp}
                  onChange={(e) => setRegNoHp(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '12px' }}>
              <label
                htmlFor="regEmail"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Alamat Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="#0284c7"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="regEmail"
                  type="email"
                  placeholder="Contoh: dimas@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label
                htmlFor="regPassword"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Buat Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#0284c7"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="regPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 4 karakter"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary button-large"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                padding: '13px',
              }}
            >
              {loading ? 'Mendaftarkan Akun...' : 'Daftar & Langsung Pesan Becak'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Seamless Persona Quick-Access for Competition Judges */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <Sparkles size={14} color="#0284c7" />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#0284c7',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Akses Cepat 1-Klik Untuk Penilaian Juri
            </span>
          </div>

          <div className="login-persona-grid">
            {DEMO_PERSONAS.map((persona) => (
              <button
                key={persona.email}
                type="button"
                onClick={() => handleSelectDemoPersona(persona.email)}
                disabled={loading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 6px',
                  borderRadius: '10px',
                  background: persona.bg,
                  border: `1.5px solid ${persona.borderColor}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
                title={`Masuk langsung sebagai ${persona.name} (${persona.label})`}
              >
                <div
                  style={{
                    color: persona.color,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {persona.icon}
                </div>
                <strong style={{ fontSize: '11px', color: '#0f172a', display: 'block' }}>
                  {persona.label}
                </strong>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {persona.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            <ShieldCheck size={14} color="#0284c7" />
            <span>Sistem Otentikasi Terenkripsi · Sesi Tersimpan Aman</span>
          </div>

          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            © 2026 BecaKlik Majalengka · Dibuat oleh <strong>Tim KALCER</strong> (GTNIC 2026)
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Memuat portal masuk...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
