'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BatteryCharging,
  ArrowRight,
  ShieldCheck,
  Compass,
  Play,
  Pause,
  Lightbulb,
  Bell,
  Sun,
  Moon,
  Sunset,
} from 'lucide-react';

// Web Audio API for Crisp "Cempreng tapi Halus" Electric Becak Horn ("Tit! Tit!")
function playBecakHorn() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('becak_sound_enabled') === 'false') {
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Custom PeriodicWave: weak fundamental (1x) + strong nasal/cempreng harmonics (2x, 3x, 4x)
    // + smooth rolloff above 6x so it sounds authentically "cempreng" (thin & bright) yet "halus" (never harsh).
    const real = new Float32Array(8);
    const imag = new Float32Array([
      0.0,  // DC
      0.22, // 1st harmonic (~880 Hz): light body so it never sounds thick/heavy
      0.88, // 2nd harmonic (~1760 Hz): bright nasal core
      1.0,  // 3rd harmonic (~2640 Hz): dominant "TIT!" cempreng vowel formant
      0.72, // 4th harmonic (~3520 Hz): crisp cempreng snap
      0.32, // 5th harmonic (~4400 Hz): smooth upper brilliance
      0.1,  // 6th harmonic (~5280 Hz): silky rolloff
      0.02, // 7th harmonic (~6160 Hz): zero harsh buzz above this
    ]);
    const cemprengWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    const triggerTitBeep = (startTime: number, duration: number, peakGain: number) => {
      // Horn flare resonator boosting the 2.7 kHz "tit" formant while cutting low bass
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(1100, startTime);

      const hornPeak = ctx.createBiquadFilter();
      hornPeak.type = 'peaking';
      hornPeak.frequency.setValueAtTime(2750, startTime);
      hornPeak.Q.setValueAtTime(1.6, startTime);
      hornPeak.gain.setValueAtTime(4.5, startTime);

      const envGain = ctx.createGain();
      envGain.gain.setValueAtTime(0.0001, startTime);
      // Crisp 6ms "T-" attack without click
      envGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
      // Steady sustain for "-it"
      envGain.gain.setValueAtTime(peakGain * 0.92, startTime + duration - 0.018);
      // Smooth 18ms release
      envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      hpFilter.connect(hornPeak);
      hornPeak.connect(envGain);
      envGain.connect(ctx.destination);

      // Dual slightly-detuned diaphragm oscillators (880 Hz + 886 Hz) with a 10ms coil-on pitch snap
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.setPeriodicWave(cemprengWave);
      oscB.setPeriodicWave(cemprengWave);

      oscA.frequency.setValueAtTime(845, startTime);
      oscA.frequency.exponentialRampToValueAtTime(880, startTime + 0.01);
      oscA.frequency.setValueAtTime(880, startTime + duration - 0.015);
      oscA.frequency.exponentialRampToValueAtTime(860, startTime + duration);

      oscB.frequency.setValueAtTime(851, startTime);
      oscB.frequency.exponentialRampToValueAtTime(886, startTime + 0.01);
      oscB.frequency.setValueAtTime(886, startTime + duration - 0.015);
      oscB.frequency.exponentialRampToValueAtTime(866, startTime + duration);

      const mixB = ctx.createGain();
      mixB.gain.setValueAtTime(0.65, startTime);

      oscA.connect(hpFilter);
      oscB.connect(mixB);
      mixB.connect(hpFilter);

      oscA.start(startTime);
      oscB.start(startTime);
      oscA.stop(startTime + duration + 0.01);
      oscB.stop(startTime + duration + 0.01);
    };

    // Beep 1: "Tit!" (75ms)
    triggerTitBeep(now, 0.075, 0.24);
    // Beep 2: "Tit!" (90ms after a crisp 50ms gap)
    triggerTitBeep(now + 0.125, 0.09, 0.26);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Ignore audio policy restrictions
  }
}

// Web Audio API for Traffic Light Switch Chime
function playSignalChime(isGreen: boolean) {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('becak_sound_enabled') === 'false') {
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (isGreen) {
      // Pleasant rising resume chime for Green Light (E5 -> G5)
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Soft gentle halt chime for Red Light (A4 -> F4)
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.16);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Audio policy
  }
}

// Web Audio API for subtle braking friction sound
function playBrakingSound() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('becak_sound_enabled') === 'false') {
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 550);
  } catch {
    // Ignore audio policy
  }
}

// Himpunan animasi kendaraan yang dikontrol kecepatannya (tidak mematikan lampu kedip atau transisi)
const DRIVING_ANIM_NAMES = new Set(['moveRoad', 'moveSkyline', 'spinWheel', 'pedalBob']);

type SimState = 'cruising' | 'braking' | 'stopped' | 'accelerating';
type IntersectionPhase = 'hidden' | 'entering' | 'stopped' | 'departing';
type SignalLight = 'GREEN' | 'YELLOW' | 'RED';
type Atmosphere = 'day' | 'sunset' | 'night';

// Palet warna baju penumpang yang berganti-ganti secara dinamis & kontras
const PASSENGER_SHIRT_PALETTES = [
  { single: '#f43f5e', pairBack: '#10b981', pairFront: '#f59e0b', headscarf: '#047857' },
  { single: '#8b5cf6', pairBack: '#f43f5e', pairFront: '#10b981', headscarf: '#be123c' },
  { single: '#f59e0b', pairBack: '#8b5cf6', pairFront: '#ec4899', headscarf: '#6d28d9' },
  { single: '#10b981', pairBack: '#ea580c', pairFront: '#8b5cf6', headscarf: '#c2410c' },
];

export function BecakListrikHeroAnimation() {
  const [simState, setSimState] = useState<SimState>('cruising');
  const [intersectionPhase, setIntersectionPhase] = useState<IntersectionPhase>('hidden');
  const [signalLight, setSignalLight] = useState<SignalLight>('GREEN');
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [lightOn, setLightOn] = useState(true);
  const [hornRinging, setHornRinging] = useState(false);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('day');
  const [shirtPaletteIdx, setShirtPaletteIdx] = useState(0);

  // Rotasi warna baju penumpang secara otomatis setiap 2.6 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setShirtPaletteIdx((prev) => (prev + 1) % PASSENGER_SHIRT_PALETTES.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const stageViewportRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentPlaybackRateRef = useRef<number>(1);
  const departTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleAtmosphere = () => {
    setAtmosphere((prev) => {
      if (prev === 'day') return 'sunset';
      if (prev === 'sunset') {
        setLightOn(true);
        return 'night';
      }
      return 'day';
    });
  };

  // Apply playback rate khusus animasi laju becak & jalan (lampu lalu lintas tetap berkedip aktif)
  const setStagePlaybackRate = (rate: number) => {
    currentPlaybackRateRef.current = rate;
    if (!stageViewportRef.current) return;
    try {
      const anims = stageViewportRef.current.getAnimations({ subtree: true });
      anims.forEach((anim) => {
        const animName = (anim as CSSAnimation).animationName;
        if (animName && DRIVING_ANIM_NAMES.has(animName)) {
          anim.playbackRate = Math.max(0, rate);
        }
      });
    } catch {
      // Fallback
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (departTimerRef.current) {
        clearTimeout(departTimerRef.current);
      }
    };
  }, []);

  // 1. ANIMASI JEDA:
  // - Lampu merah dan tiang awalnya tersembunyi ("ngehilang dulu")
  // - Saat Jeda diklik: tiang lampu merah menyala & marka meluncur masuk dari kanan sesuai jalan
  // - Becak melambat pelan-pelan (1.3s) dan berhenti tertib pas di depan garis marka
  const handleJeda = () => {
    if (simState === 'braking' || simState === 'stopped') return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (departTimerRef.current) {
      clearTimeout(departTimerRef.current);
      departTimerRef.current = null;
    }

    // Lampu merah aktif dan meluncur masuk dari kanan mengikuti alur jalan
    setSignalLight('RED');
    setIntersectionPhase('entering');
    setSimState('braking');
    playBrakingSound();

    const startRate =
      currentPlaybackRateRef.current > 0 ? currentPlaybackRateRef.current : speedMultiplier;
    const startTime = performance.now();
    const brakeDuration = 1200; // 1.2 detik pengereman halus teratur

    const stepBrake = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / brakeDuration);

      // Smooth cubic ease-out curve untuk pengereman natural tanpa hentakan
      const factor = Math.pow(1 - progress, 3);
      const newRate = Math.max(0, startRate * factor);
      setStagePlaybackRate(newRate);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(stepBrake);
      } else {
        // Becak berhenti total tepat di depan garis marka simpang
        setStagePlaybackRate(0);
        setSimState('stopped');
        setIntersectionPhase('stopped');
        playSignalChime(false); // Bel sinyal merah berbunyi konfirmasi henti
      }
    };

    animFrameRef.current = requestAnimationFrame(stepBrake);
  };

  // 2. ANIMASI LANJUT:
  // - Lampu hijau langsung menyala benderang!
  // - Becak mulai melaju dan berakselerasi maju secara mulus tanpa getar
  // - Tiang lampu & simpang meluncur ke kiri menjauh seiring jalan melaju, lalu menghilang
  const handleLanjut = () => {
    if (simState === 'cruising' || simState === 'accelerating') return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (departTimerRef.current) {
      clearTimeout(departTimerRef.current);
      departTimerRef.current = null;
    }

    // 1. Lampu hijau langsung menyala!
    setSignalLight('GREEN');
    playSignalChime(true); // Bel riang lampu hijau
    setSimState('accelerating');

    // 2. Simpang & lampu hijau meluncur ke kiri menjauh
    setIntersectionPhase('departing');

    // Mulai dari 0 tanpa lonjakan kecepatan
    setStagePlaybackRate(0);

    const targetRate = speedMultiplier;
    const startTime = performance.now();
    const accelDuration = 1000; // 1.0 detik akselerasi halus stabil

    const stepAccel = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / accelDuration);

      // Smooth cubic ease-out curve tanpa getaran layar
      const factor = 1 - Math.pow(1 - progress, 3);
      const newRate = Math.min(targetRate, targetRate * factor);
      setStagePlaybackRate(newRate);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(stepAccel);
      } else {
        // Meluncur normal di kecepatan jelajah
        setStagePlaybackRate(targetRate);
        setSimState('cruising');
      }
    };

    animFrameRef.current = requestAnimationFrame(stepAccel);

    // 3. Reset fase simpang setelah meluncur keluar selesai (1.38s)
    departTimerRef.current = setTimeout(() => {
      setIntersectionPhase((prev) => (prev === 'departing' ? 'hidden' : prev));
    }, 1380);
  };

  const handleTogglePlayPause = () => {
    if (simState === 'cruising' || simState === 'accelerating') {
      handleJeda();
    } else {
      handleLanjut();
    }
  };

  const handleToggleSpeed = () => {
    const nextSpeed = speedMultiplier === 1 ? 1.8 : 1;
    setSpeedMultiplier(nextSpeed);
    if (simState === 'cruising') {
      setStagePlaybackRate(nextSpeed);
    }
  };

  const handleKlakson = () => {
    playBecakHorn();
    setHornRinging(true);
    setTimeout(() => setHornRinging(false), 900);
  };

  return (
    <section className="becak-anim-section">
      {/* Background Ambience */}
      <div className="becak-anim-bg-glow" />

      <div className="container">
        {/* Top Tag & Title */}
        <div className="becak-anim-header">
          <div className="pill-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Image
              src="/logo-becaklik.png"
              alt="Logo BecaKlik"
              width={26}
              height={17}
              style={{ objectFit: 'contain' }}
            />
            <span>BECAKLIK · TRANSPORTASI BECAK LISTRIK KOTA MAJALENGKA</span>
          </div>

          <h1 className="becak-anim-title">
            Mobilitas Hijau BecaKlik Majalengka
          </h1>

          <p className="becak-anim-subtitle">
            Rasakan kenyamanan keliling pusat kota Majalengka, dari Bunderan Munjul, Alun-Alun, hingga Gedung Juang dengan armada becak listrik bertenaga baterai lithium modern. Tanpa polusi, hening tanpa bising, dan bertarif transparan.
          </p>

          <div className="becak-anim-quick-actions">
            <Link
              href="/login?role=pelanggan"
              className="button button-primary button-large"
            >
              Mulai Perjalanan Sekarang <ArrowRight size={18} />
            </Link>
            <a
              href="#destinasi-majalengka"
              className="button button-outline button-large"
            >
              Jelajahi Pesona Majalengka <Compass size={18} />
            </a>
          </div>
        </div>

        {/* The Animated Stage */}
        <div className="becak-stage-card">
          {/* Stage Top Bar: Telemetry Info & Traffic Signal Badge */}
          <div className="stage-topbar">
            <div className="telemetry-item">
              <span className="live-indicator-dot" />
              <strong>SIMULASI SISTEM AKTIF</strong>
            </div>

            <div className="telemetry-badges">
              {/* Interactive Traffic Light Signal Badge */}
              <button
                type="button"
                className={`traffic-status-badge ${
                  signalLight === 'RED'
                    ? 'status-badge-red'
                    : signalLight === 'YELLOW'
                    ? 'status-badge-yellow'
                    : 'status-badge-green'
                }`}
                onClick={handleTogglePlayPause}
                title="Klik untuk simulasi mendekati simpang / lanjut jalan"
              >
                <span
                  className={
                    signalLight === 'RED'
                      ? 'traffic-dot-red-pulse'
                      : signalLight === 'YELLOW'
                      ? 'traffic-dot-yellow-pulse'
                      : 'traffic-dot-green-pulse'
                  }
                />
                <span>
                  {simState === 'cruising' &&
                    intersectionPhase === 'hidden' &&
                    '🟢 JALUR UTAMA BEBAS'}
                  {simState === 'braking' &&
                    '🛑 LAMPU MERAH (MENGEREM)'}
                  {simState === 'stopped' &&
                    '🛑 LAMPU MERAH (BERHENTI)'}
                  {simState === 'accelerating' &&
                    '🟢 LAMPU HIJAU (MELAJU)'}
                </span>
              </button>

              <span className="telemetry-pill">
                <BatteryCharging size={14} /> Baterai 96%
              </span>
            </div>

            {/* Stage Controls */}
            <div className="stage-controls">
              {/* Atmosphere Switcher */}
              <button
                type="button"
                className="ctrl-btn"
                onClick={handleToggleAtmosphere}
                title="Ganti Suasana Waktu Majalengka (Siang / Senja Kota Angin / Malam)"
                style={{
                  background:
                    atmosphere === 'night'
                      ? '#0f172a'
                      : atmosphere === 'sunset'
                      ? '#c2410c'
                      : '#ffffff',
                  color:
                    atmosphere === 'night' || atmosphere === 'sunset'
                      ? '#ffffff'
                      : '#0284c7',
                  borderColor:
                    atmosphere === 'night'
                      ? '#38bdf8'
                      : atmosphere === 'sunset'
                      ? '#fdba74'
                      : '#bae6fd',
                  fontWeight: 700,
                }}
              >
                {atmosphere === 'day' && (
                  <>
                    <Sun size={15} color="#eab308" /> ☀️ Siang
                  </>
                )}
                {atmosphere === 'sunset' && (
                  <>
                    <Sunset size={15} color="#fde047" /> 🌅 Senja
                  </>
                )}
                {atmosphere === 'night' && (
                  <>
                    <Moon size={15} color="#38bdf8" /> 🌙 Malam
                  </>
                )}
              </button>

              {/* Horn Button */}
              <button
                type="button"
                className={`ctrl-btn ${hornRinging ? 'ctrl-btn-active' : ''}`}
                onClick={handleKlakson}
                title="Bunyikan Bel Becak Listrik (Kring-kring!)"
                style={{
                  background: hornRinging ? '#0284c7' : '#ffffff',
                  color: hornRinging ? '#ffffff' : '#0284c7',
                  borderColor: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                <Bell size={15} className={hornRinging ? 'icon-pulse' : ''} />
                {hornRinging ? 'Kring-kring! 🔔' : 'Klakson Becak'}
              </button>

              {/* Headlight Toggle */}
              <button
                type="button"
                className={`ctrl-btn ${lightOn ? 'ctrl-btn-active' : ''}`}
                onClick={() => setLightOn(!lightOn)}
                title={lightOn ? 'Matikan Lampu Depan' : 'Nyalakan Lampu Depan'}
              >
                <Lightbulb size={15} /> {lightOn ? 'Lampu ON' : 'Lampu OFF'}
              </button>

              {/* Speed Multiplier Button */}
              <button
                type="button"
                className="ctrl-btn"
                onClick={handleToggleSpeed}
                title="Atur Kecepatan Animasi Laju Becak (1x / 2x)"
              >
                ⚡ {speedMultiplier === 1 ? '1x Laju' : '2x Cepat'}
              </button>

              {/* Traffic Light Pause / Resume Button */}
              <button
                type="button"
                className={`ctrl-btn ${
                  simState === 'stopped'
                    ? 'ctrl-btn-green'
                    : simState === 'braking'
                    ? 'ctrl-btn-yellow'
                    : 'ctrl-btn-red'
                }`}
                onClick={handleTogglePlayPause}
                title={
                  simState === 'cruising' || simState === 'accelerating'
                    ? 'Jeda (Mendekati Simpang & Lampu Merah)'
                    : 'Nyalakan Lampu Hijau & Meluncur Kembali'
                }
              >
                {simState === 'cruising' ? (
                  <>
                    <Pause size={15} /> 🛑 Jeda (Simpang Merah)
                  </>
                ) : simState === 'braking' ? (
                  <>
                    <Pause size={15} /> ⚠️ Mengerem di Simpang...
                  </>
                ) : (
                  <>
                    <Play size={15} /> 🟢 Lanjut (Lampu Hijau)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* The Visual Viewport with Dynamic Atmosphere */}
          <div className={`stage-viewport theme-${atmosphere}`} ref={stageViewportRef}>
            {/* Smooth Cross-Fading Sky Layers */}
            <div className="sky-layer sky-layer-day" />
            <div className="sky-layer sky-layer-sunset" />
            <div className="sky-layer sky-layer-night" />

            {/* Persistent Celestial Sun with Hardware-Accelerated Smooth Transition */}
            <div className="sky-sun">
              <div className="sun-core" />
            </div>

            {/* Persistent Celestial Moon with Hardware-Accelerated Smooth Transition */}
            <div className="sky-moon">
              <div className="moon-crescent" />
            </div>

            {/* Persistent Twinkling Stars Field with Smooth Cross-Fade */}
            <div className="stars-field">
              <span className="star star-1" />
              <span className="star star-2" />
              <span className="star star-3" />
              <span className="star star-4" />
              <span className="star star-5" />
              <span className="star star-6" />
              <span className="star star-7" />
              <span className="star star-8" />
            </div>

            {/* Floating Soft Clouds Layer */}
            <div className="clouds-floating-layer">
              <div className="cloud cloud-slow">
                <svg
                  viewBox="0 0 120 40"
                  width="120"
                  height="40"
                  className="cloud-svg-shape"
                >
                  <path d="M15 35 Q0 35 5 25 Q10 10 28 14 Q38 2 55 10 Q70 0 85 12 Q105 5 110 22 Q120 28 115 35 Z" />
                </svg>
              </div>
              <div className="cloud cloud-medium">
                <svg
                  viewBox="0 0 95 32"
                  width="95"
                  height="32"
                  className="cloud-svg-shape"
                >
                  <path d="M12 28 Q0 28 4 20 Q8 8 22 11 Q30 2 44 8 Q56 0 68 10 Q84 4 88 18 Q96 22 92 28 Z" />
                </svg>
              </div>
            </div>

            {/* Flying Birds Flock over Mount Ciremai */}
            <div className="birds-flying-flock">
              <div className="bird bird-1">
                <svg viewBox="0 0 30 18" width="20" height="12">
                  <path
                    className="bird-svg-shape"
                    d="M15 10 Q8 2 0 4 Q7 9 15 10 Q23 9 30 4 Q22 2 15 10 Z"
                  />
                </svg>
              </div>
              <div className="bird bird-2">
                <svg viewBox="0 0 30 18" width="15" height="9">
                  <path
                    className="bird-svg-shape"
                    d="M15 10 Q8 2 0 4 Q7 9 15 10 Q23 9 30 4 Q22 2 15 10 Z"
                  />
                </svg>
              </div>
              <div className="bird bird-3">
                <svg viewBox="0 0 30 18" width="12" height="7">
                  <path
                    className="bird-svg-shape"
                    d="M15 10 Q8 2 0 4 Q7 9 15 10 Q23 9 30 4 Q22 2 15 10 Z"
                  />
                </svg>
              </div>
            </div>

            {/* Majalengka Heritage Skyline (Parallax Backdrop) */}
            <div className="skyline-backdrop skyline-moving">
              <svg
                viewBox="0 0 2400 180"
                className="skyline-svg"
                preserveAspectRatio="none"
              >
                {/* --- SEGMENT 1 (0 to 1200) --- */}
                {/* 1. GUNUNG CIREMAI (3.078 mdpl) - Ikon Alam Megah Majalengka */}
                <path
                  d="M0 180 L40 150 Q180 60 280 25 Q350 45 460 140 L520 180 Z"
                  fill="rgba(2, 132, 199, 0.1)"
                />
                <path
                  d="M120 180 Q250 85 300 70 Q370 85 480 180 Z"
                  fill="rgba(14, 165, 233, 0.08)"
                />
                {/* Foothills / Terasering Panyaweuyan Argapura */}
                <path
                  d="M0 180 Q60 160 140 160 Q200 152 260 165 Q330 155 420 180 Z"
                  fill="rgba(2, 132, 199, 0.12)"
                />

                {/* 2. TUGU BOLA DUNIA BUNDERAN MUNJUL (Simbol Gerbang Kota Majalengka) */}
                <g transform="translate(130, 68)">
                  <path
                    d="M10 112 L14 46 Q19 28 26 22 Q33 28 38 46 L42 112 Z"
                    fill="rgba(2, 132, 199, 0.28)"
                  />
                  <circle
                    cx="26"
                    cy="20"
                    r="20"
                    stroke="rgba(14, 165, 233, 0.45)"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <ellipse
                    cx="26"
                    cy="20"
                    rx="20"
                    ry="9"
                    stroke="rgba(14, 165, 233, 0.35)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <ellipse
                    cx="26"
                    cy="20"
                    rx="9"
                    ry="20"
                    stroke="rgba(14, 165, 233, 0.35)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="26" cy="20" r="15" fill="rgba(2, 132, 199, 0.22)" />
                  <path
                    d="M5 112 Q14 90 22 96 Q26 102 26 112 M47 112 Q38 90 30 96 Q26 102 26 112"
                    stroke="rgba(56, 189, 248, 0.4)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <text
                    x="26"
                    y="124"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    BUNDERAN MUNJUL
                  </text>
                </g>

                {/* 3. MONUMEN DIRGANTARA (Pesawat Tempur Lanud Sugiri Sukani Majalengka) */}
                <g transform="translate(325, 78)">
                  <path
                    d="M30 102 L38 35 L44 35 L36 102 Z"
                    fill="rgba(2, 132, 199, 0.32)"
                  />
                  <path
                    d="M18 42 L42 32 L66 26 L62 23 L44 27 L33 16 L25 18 L32 29 L12 33 Z"
                    fill="rgba(14, 165, 233, 0.38)"
                  />
                  <path
                    d="M32 29 L28 14 L35 24 Z"
                    fill="rgba(2, 132, 199, 0.45)"
                  />
                </g>

                {/* 4. MASJID AGUNG AL-IMAM MAJALENGKA (Alun-Alun Sentral) */}
                <g transform="translate(470, 62)">
                  <path
                    d="M12 118 L12 28 L15 16 L17 7 L19 16 L22 28 L22 118 Z"
                    fill="rgba(2, 132, 199, 0.3)"
                  />
                  <rect
                    x="9"
                    y="45"
                    width="16"
                    height="4"
                    rx="1"
                    fill="rgba(2, 132, 199, 0.4)"
                  />
                  <circle cx="17" cy="5" r="2.5" fill="#0ea5e9" />
                  <rect
                    x="32"
                    y="60"
                    width="82"
                    height="58"
                    rx="3"
                    fill="rgba(14, 165, 233, 0.16)"
                  />
                  <path
                    d="M48 60 C48 32 98 32 98 60 Z"
                    fill="rgba(2, 132, 199, 0.28)"
                  />
                  <path
                    d="M73 32 L73 22 L74 18 L75 22 L75 32"
                    stroke="rgba(2, 132, 199, 0.45)"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M40 118 L40 92 Q46 84 52 92 L52 118 M58 118 L58 92 Q64 84 70 92 L70 118 M76 118 L76 92 Q82 84 88 92 L88 118 M94 118 L94 92 Q100 84 106 92 L106 118"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <text
                    x="73"
                    y="130"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    MASJID AGUNG AL-IMAM
                  </text>
                </g>

                {/* 5. GEDUNG JUANG '45 MAJALENGKA (Heritage Kolonial Bersejarah) */}
                <g transform="translate(680, 84)">
                  <path
                    d="M0 96 L0 38 L45 8 L90 38 L90 96 Z"
                    fill="rgba(2, 132, 199, 0.22)"
                  />
                  <rect
                    x="90"
                    y="46"
                    width="65"
                    height="50"
                    fill="rgba(14, 165, 233, 0.16)"
                  />
                  <rect
                    x="16"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <rect
                    x="38"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <rect
                    x="60"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <circle
                    cx="45"
                    cy="26"
                    r="6"
                    fill="#ffffff"
                    stroke="rgba(2, 132, 199, 0.4)"
                    strokeWidth="1"
                  />
                  <line
                    x1="45"
                    y1="26"
                    x2="45"
                    y2="22"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <line
                    x1="45"
                    y1="26"
                    x2="48"
                    y2="26"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <text
                    x="45"
                    y="108"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    GEDUNG JUANG &apos;45
                  </text>
                </g>

                {/* 6. ALUN-ALUN MAJALENGKA (Beringin & Tiang Lampu Ornamen Kujang) */}
                <g transform="translate(890, 88)">
                  <circle
                    cx="50"
                    cy="40"
                    r="28"
                    fill="rgba(2, 132, 199, 0.16)"
                  />
                  <circle
                    cx="70"
                    cy="36"
                    r="22"
                    fill="rgba(14, 165, 233, 0.14)"
                  />
                  <rect
                    x="48"
                    y="65"
                    width="6"
                    height="27"
                    fill="rgba(2, 132, 199, 0.25)"
                  />
                  <path
                    d="M12 92 L12 25 Q12 12 24 12 L28 12 Q30 18 24 20 L16 20 L16 92 Z"
                    fill="rgba(56, 189, 248, 0.38)"
                  />
                  <circle cx="26" cy="16" r="3.5" fill="#38bdf8" />
                </g>

                {/* 7. BANDARA INTERNASIONAL KERTAJATI (BIJB Aerodynamic Canopy) */}
                <g transform="translate(1040, 105)">
                  <path
                    d="M0 75 Q40 40 100 42 Q130 44 150 75 Z"
                    fill="rgba(2, 132, 199, 0.18)"
                  />
                  <line
                    x1="30"
                    y1="75"
                    x2="30"
                    y2="48"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="65"
                    y1="75"
                    x2="65"
                    y2="43"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="100"
                    y1="75"
                    x2="100"
                    y2="44"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                </g>

                {/* --- SEGMENT 2 (Seamless loop 1200 to 2400) --- */}
                {/* 1. Gunung Ciremai */}
                <path
                  d="M1200 180 L1240 150 Q1380 60 1480 25 Q1550 45 1660 140 L1720 180 Z"
                  fill="rgba(2, 132, 199, 0.1)"
                />
                <path
                  d="M1320 180 Q1450 85 1500 70 Q1570 85 1680 180 Z"
                  fill="rgba(14, 165, 233, 0.08)"
                />
                <path
                  d="M1200 180 Q1260 160 1340 160 Q1400 152 1460 165 Q1530 155 1620 180 Z"
                  fill="rgba(2, 132, 199, 0.12)"
                />

                {/* 2. Bunderan Munjul */}
                <g transform="translate(1330, 68)">
                  <path
                    d="M10 112 L14 46 Q19 28 26 22 Q33 28 38 46 L42 112 Z"
                    fill="rgba(2, 132, 199, 0.28)"
                  />
                  <circle
                    cx="26"
                    cy="20"
                    r="20"
                    stroke="rgba(14, 165, 233, 0.45)"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <ellipse
                    cx="26"
                    cy="20"
                    rx="20"
                    ry="9"
                    stroke="rgba(14, 165, 233, 0.35)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <ellipse
                    cx="26"
                    cy="20"
                    rx="9"
                    ry="20"
                    stroke="rgba(14, 165, 233, 0.35)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="26" cy="20" r="15" fill="rgba(2, 132, 199, 0.22)" />
                  <path
                    d="M5 112 Q14 90 22 96 Q26 102 26 112 M47 112 Q38 90 30 96 Q26 102 26 112"
                    stroke="rgba(56, 189, 248, 0.4)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <text
                    x="26"
                    y="124"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    BUNDERAN MUNJUL
                  </text>
                </g>

                {/* 3. Monumen Dirgantara */}
                <g transform="translate(1525, 78)">
                  <path
                    d="M30 102 L38 35 L44 35 L36 102 Z"
                    fill="rgba(2, 132, 199, 0.32)"
                  />
                  <path
                    d="M18 42 L42 32 L66 26 L62 23 L44 27 L33 16 L25 18 L32 29 L12 33 Z"
                    fill="rgba(14, 165, 233, 0.38)"
                  />
                  <path
                    d="M32 29 L28 14 L35 24 Z"
                    fill="rgba(2, 132, 199, 0.45)"
                  />
                </g>

                {/* 4. Masjid Agung Al-Imam */}
                <g transform="translate(1670, 62)">
                  <path
                    d="M12 118 L12 28 L15 16 L17 7 L19 16 L22 28 L22 118 Z"
                    fill="rgba(2, 132, 199, 0.3)"
                  />
                  <rect
                    x="9"
                    y="45"
                    width="16"
                    height="4"
                    rx="1"
                    fill="rgba(2, 132, 199, 0.4)"
                  />
                  <circle cx="17" cy="5" r="2.5" fill="#0ea5e9" />
                  <rect
                    x="32"
                    y="60"
                    width="82"
                    height="58"
                    rx="3"
                    fill="rgba(14, 165, 233, 0.16)"
                  />
                  <path
                    d="M48 60 C48 32 98 32 98 60 Z"
                    fill="rgba(2, 132, 199, 0.28)"
                  />
                  <path
                    d="M73 32 L73 22 L74 18 L75 22 L75 32"
                    stroke="rgba(2, 132, 199, 0.45)"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M40 118 L40 92 Q46 84 52 92 L52 118 M58 118 L58 92 Q64 84 70 92 L70 118 M76 118 L76 92 Q82 84 88 92 L88 118 M94 118 L94 92 Q100 84 106 92 L106 118"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <text
                    x="73"
                    y="130"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    MASJID AGUNG AL-IMAM
                  </text>
                </g>

                {/* 5. Gedung Juang '45 */}
                <g transform="translate(1880, 84)">
                  <path
                    d="M0 96 L0 38 L45 8 L90 38 L90 96 Z"
                    fill="rgba(2, 132, 199, 0.22)"
                  />
                  <rect
                    x="90"
                    y="46"
                    width="65"
                    height="50"
                    fill="rgba(14, 165, 233, 0.16)"
                  />
                  <rect
                    x="16"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <rect
                    x="38"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <rect
                    x="60"
                    y="46"
                    width="6"
                    height="50"
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                  <circle
                    cx="45"
                    cy="26"
                    r="6"
                    fill="#ffffff"
                    stroke="rgba(2, 132, 199, 0.4)"
                    strokeWidth="1"
                  />
                  <line
                    x1="45"
                    y1="26"
                    x2="45"
                    y2="22"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <line
                    x1="45"
                    y1="26"
                    x2="48"
                    y2="26"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <text
                    x="45"
                    y="108"
                    fontSize="7"
                    fill="rgba(2, 132, 199, 0.55)"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    GEDUNG JUANG &apos;45
                  </text>
                </g>

                {/* 6. Alun-Alun Majalengka */}
                <g transform="translate(2090, 88)">
                  <circle
                    cx="50"
                    cy="40"
                    r="28"
                    fill="rgba(2, 132, 199, 0.16)"
                  />
                  <circle
                    cx="70"
                    cy="36"
                    r="22"
                    fill="rgba(14, 165, 233, 0.14)"
                  />
                  <rect
                    x="48"
                    y="65"
                    width="6"
                    height="27"
                    fill="rgba(2, 132, 199, 0.25)"
                  />
                  <path
                    d="M12 92 L12 25 Q12 12 24 12 L28 12 Q30 18 24 20 L16 20 L16 92 Z"
                    fill="rgba(56, 189, 248, 0.38)"
                  />
                  <circle cx="26" cy="16" r="3.5" fill="#38bdf8" />
                </g>

                {/* 7. BIJB Kertajati */}
                <g transform="translate(2240, 105)">
                  <path
                    d="M0 75 Q40 40 100 42 Q130 44 150 75 Z"
                    fill="rgba(2, 132, 199, 0.18)"
                  />
                  <line
                    x1="30"
                    y1="75"
                    x2="30"
                    y2="48"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="65"
                    y1="75"
                    x2="65"
                    y2="43"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="100"
                    y1="75"
                    x2="100"
                    y2="44"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
            </div>

            {/* Glowing Energy Particles */}
            <div className="energy-particles-field">
              <span className="particle particle-1" />
              <span className="particle particle-2" />
              <span className="particle particle-3" />
              <span className="particle particle-4" />
            </div>

            {/* Passing Eco Commuter Cyclist (Warga Bersepeda Santai) */}
            <div className="eco-commuter-track">
              <div className="eco-commuter-rider">
                <svg viewBox="0 0 110 75" width="105" height="72" fill="none">
                  <g transform="scale(-1, 1) translate(-110, 0)">
                    {/* Rear Wheel */}
                    <g
                      className="commuter-wheel-rear"
                      style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                    >
                      <circle cx="24" cy="54" r="14" stroke="#1e293b" strokeWidth="3.5" fill="#f8fafc" />
                      <circle cx="24" cy="54" r="4" fill="#0284c7" />
                      <line x1="24" y1="40" x2="24" y2="68" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="10" y1="54" x2="38" y2="54" stroke="#94a3b8" strokeWidth="1.2" />
                    </g>
                    {/* Front Wheel */}
                    <g
                      className="commuter-wheel-front"
                      style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                    >
                      <circle cx="86" cy="54" r="14" stroke="#1e293b" strokeWidth="3.5" fill="#f8fafc" />
                      <circle cx="86" cy="54" r="4" fill="#0284c7" />
                      <line x1="86" y1="40" x2="86" y2="68" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="72" y1="54" x2="100" y2="54" stroke="#94a3b8" strokeWidth="1.2" />
                    </g>
                    {/* Bike Frame */}
                    <path d="M24 54 L44 38 L68 38 L86 54 M44 38 L54 54 L68 38 M54 54 L24 54" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Handlebars & Seat */}
                    <path d="M68 38 L64 22 L72 20" stroke="#0369a1" strokeWidth="3" strokeLinecap="round" />
                    <path d="M44 38 L42 30 L48 30" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
                    {/* Cyclist Neck & Head */}
                    <path d="M46 19 L47 24" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="46" cy="15" r="6.5" fill="#f59e0b" />
                    {/* Helmet */}
                    <path d="M39 15 Q46 7 53 13 Z" fill="#22c55e" />
                    {/* Torso */}
                    <path d="M46 22 L52 38" stroke="#0284c7" strokeWidth="5.5" strokeLinecap="round" />
                    {/* Arms to handlebar */}
                    <path d="M48 24 L64 23" stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                    {/* Legs pedaling */}
                    <path d="M52 38 L56 46 L54 54" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" className="commuter-pedal-leg" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Kota Angin Majalengka Leaves Drifting */}
            <div className="kota-angin-leaves">
              <div className="drift-leaf leaf-1">
                <svg viewBox="0 0 24 16" width="18" height="12">
                  <path d="M2 14 C6 14 18 10 22 2 C16 4 8 10 2 14 Z" fill="#22c55e" opacity="0.85" />
                  <line x1="2" y1="14" x2="18" y2="4" stroke="#15803d" strokeWidth="0.8" />
                </svg>
              </div>
              <div className="drift-leaf leaf-2">
                <svg viewBox="0 0 24 16" width="14" height="9">
                  <path d="M2 14 C6 14 18 10 22 2 C16 4 8 10 2 14 Z" fill="#34d399" opacity="0.8" />
                </svg>
              </div>
              <div className="drift-leaf leaf-3">
                <svg viewBox="0 0 24 16" width="16" height="10">
                  <path d="M2 14 C6 14 18 10 22 2 C16 4 8 10 2 14 Z" fill="#10b981" opacity="0.75" />
                </svg>
              </div>
            </div>

            {/* Convoy of 2 Electric Becaks - Riding Together on Asphalt (1 Passenger & 2 Passengers) */}
            <div className="becak-position-wrap">
              <div
                className={`becak-vehicle ${
                  simState === 'braking'
                    ? 'becak-braking'
                    : simState === 'accelerating'
                    ? 'becak-accelerating'
                    : simState === 'stopped'
                    ? 'becak-stopped'
                    : 'becak-bobbing'
                }`}
              >
                {/* Horn Acoustic Ring Ripple / Bubble */}
                {hornRinging && (
                  <div
                    className="pop-in-success"
                    style={{
                      position: 'absolute',
                      top: '-42px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      boxShadow: '0 6px 18px rgba(2, 132, 199, 0.4)',
                      border: '1.5px solid #ffffff',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    <Bell size={13} className="icon-pulse" />
                    <span>Tit! Tit! 🔊⚡</span>
                  </div>
                )}

                {[
                  {
                    unitCode: 'BL-02',
                    passengerCount: 1 as const,
                    leftPx: 0,
                    bottomPx: 2,
                    widthPx: 248,
                    heightPx: 163,
                    bobDelay: '0s',
                  },
                  {
                    unitCode: 'BL-01',
                    passengerCount: 2 as const,
                    leftPx: 256,
                    bottomPx: 0,
                    widthPx: 254,
                    heightPx: 167,
                    bobDelay: '-0.75s',
                  },
                ].map((unit) => {
                  const palette = PASSENGER_SHIRT_PALETTES[shirtPaletteIdx];
                  return (
                  <div
                    key={unit.unitCode}
                    className="becak-chassis-wrap becak-unit-gliding"
                    onClick={handleKlakson}
                    title="Klik bodi becak untuk membunyikan klakson!"
                    style={{
                      cursor: 'pointer',
                      position: 'absolute',
                      left: `${unit.leftPx}px`,
                      bottom: `${unit.bottomPx}px`,
                      width: `${unit.widthPx}px`,
                      height: `${unit.heightPx}px`,
                      animationDelay: unit.bobDelay,
                    }}
                  >
                    {/* Headlight Beam Effect on BOTH Becaks - Shining Forward To Right */}
                    {lightOn && (
                      <div
                        className="headlight-beam headlight-beaming"
                        style={{
                          top: '80px',
                          left: `${Math.round(unit.widthPx * 0.865)}px`,
                          width: unit.passengerCount === 2 ? '210px' : '155px',
                          height: '50px',
                        }}
                      />
                    )}

                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 320 210"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="becak-svg"
                    >
                      {/* Drop Shadow firmly on Asphalt Ground */}
                      <ellipse
                        cx="160"
                        cy="192"
                        rx="125"
                        ry="8"
                        fill="rgba(15, 23, 42, 0.55)"
                      />

                      {/* REAR WHEEL (Driver propels at the left/rear - Exact Axle Center 64,164) */}
                      <g
                        className="becak-wheel wheel-rear wheel-spinning"
                        style={{
                          transformOrigin: '64px 164px',
                          transformBox: 'view-box',
                        }}
                      >
                        <circle
                          cx="64"
                          cy="164"
                          r="26"
                          stroke="#0f172a"
                          strokeWidth="6"
                          fill="#1e293b"
                        />
                        <circle
                          cx="64"
                          cy="164"
                          r="21"
                          stroke="#e2e8f0"
                          strokeWidth="2"
                          fill="none"
                        />
                        {/* Spokes */}
                        <line
                          x1="64"
                          y1="140"
                          x2="64"
                          y2="188"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="40"
                          y1="164"
                          x2="88"
                          y2="164"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="47"
                          y1="147"
                          x2="81"
                          y2="181"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="47"
                          y1="181"
                          x2="81"
                          y2="147"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        {/* Electric Hub Motor Accent */}
                        <circle cx="64" cy="164" r="8.5" fill="#0284c7" />
                        <circle cx="64" cy="164" r="3.5" fill="#38bdf8" />
                      </g>

                      {/* Sleek Rear Fender over Rear Wheel */}
                      <path
                        d="M34 162 A 30 30 0 0 1 94 156"
                        stroke="#0284c7"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Clean Rear Bicycle Frame (Matches BecaKlik Logo Geometry) */}
                      <path
                        d="M64 164 L102 164 L126 158"
                        stroke="#0369a1"
                        strokeWidth="4.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {/* Rear Stay & Seat Tube Triangle */}
                      <path
                        d="M64 164 L88 124 L102 164"
                        stroke="#0369a1"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {/* Seatpost to Saddle */}
                      <path
                        d="M88 124 L86 115"
                        stroke="#0369a1"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      {/* Step-Through Frame Tube to Cabin */}
                      <path
                        d="M88 124 L100 124 L114 148 L126 148"
                        stroke="#0284c7"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {/* Ergonomic Driver Saddle */}
                      <path
                        d="M76 114 C76 109 97 109 98 114 C98 117 93 119 85 119 C79 119 76 116 76 114 Z"
                        fill="#0f172a"
                      />
                      {/* Steering Column & Handlebars */}
                      <path
                        d="M122 158 L118 96 L108 96"
                        stroke="#0369a1"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />

                      {/* Animated Mitra Driver on Saddle */}
                      <g className="becak-driver-character">
                        {/* Crankset & Electric Assist Gear Hub */}
                        <circle
                          cx="102"
                          cy="164"
                          r="7"
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <circle cx="102" cy="164" r="2.5" fill="#38bdf8" />
                        {/* Clean Pedaling Leg (Anchored smoothly at Hip 88,114) */}
                        <g
                          className="driver-pedaling-legs"
                          style={{
                            transformOrigin: '88px 114px',
                            transformBox: 'view-box',
                          }}
                        >
                          <path
                            d="M88 114 L107 134 L102 158"
                            stroke="#1e293b"
                            strokeWidth="6.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                          <rect
                            x="97"
                            y="156"
                            width="13"
                            height="5.5"
                            rx="2.8"
                            fill="#0f172a"
                            stroke="#38bdf8"
                            strokeWidth="1"
                          />
                        </g>
                        {/* Driver Neck */}
                        <rect
                          x="90"
                          y="73"
                          width="6"
                          height="9"
                          rx="3"
                          fill="#fbbf24"
                        />
                        {/* Driver Torso (Official Majalengka Blue Jacket) */}
                        <path
                          d="M80 114 C80 97 84 82 91 80 L100 81 C103 93 100 106 95 114 Z"
                          fill="#0284c7"
                        />
                        {/* High-Vis Cyan Safety Stripe */}
                        <path
                          d="M82 99 L99 100 M84 90 L100 91"
                          stroke="#38bdf8"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                        {/* Driver Head */}
                        <circle cx="94" cy="67" r="8.5" fill="#fbbf24" />
                        {/* Friendly Eye & Smile (Well below Cap Visor) */}
                        <circle cx="98.5" cy="67.5" r="1.3" fill="#0f172a" />
                        <path
                          d="M96.5 71 Q99 72.5 100.5 71"
                          stroke="#0f172a"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        {/* Mitra Becak Cap & Visor */}
                        <path
                          d="M85 63 C85 55 101 55 102 63 Z"
                          fill="#0369a1"
                        />
                        <path
                          d="M85 63 L109 63"
                          stroke="#0284c7"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        {/* Driver Arm & Hand Gripping Handlebar */}
                        <path
                          d="M93 84 L100 95 L108 96"
                          stroke="#0ea5e9"
                          strokeWidth="5.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        <circle cx="109" cy="96" r="3.2" fill="#fbbf24" />
                      </g>

                      {/* Interior Seat Backrest & Animated Passenger(s) (1 Passenger vs 2 Passengers) */}
                      <rect
                        x="140"
                        y="78"
                        width="12"
                        height="24"
                        rx="5"
                        fill="#0369a1"
                      />
                      {unit.passengerCount === 2 ? (
                        <g className="becak-passenger-character">
                          {/* Passenger 1 (Seated Left/Back in Cabin - Dynamic Shirt Color) */}
                          <path
                            d="M167 76 L167 85"
                            stroke="#fde68a"
                            strokeWidth="4.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M155 106 C155 95 158 84 164 82 L174 83 C177 93 176 101 172 106 Z"
                            fill={palette.pairBack}
                            style={{ transition: 'fill 0.65s ease' }}
                          />
                          <circle cx="168" cy="70" r="7.5" fill="#fde68a" />
                          {/* Hijab / Neat Hair */}
                          <path
                            d="M159 72 C159 60 176 60 176 72 C174 66 162 66 159 72 Z"
                            fill={palette.headscarf}
                            style={{ transition: 'fill 0.65s ease' }}
                          />
                          <circle cx="172" cy="69.5" r="1.2" fill="#0f172a" />
                          <path
                            d="M170 73 Q172.5 74.5 174 73"
                            stroke="#0f172a"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            fill="none"
                          />

                          {/* Passenger 2 (Seated Right/Front in Cabin - Dynamic Shirt Color & Waving) */}
                          <path
                            d="M192 77 L192 86"
                            stroke="#fed7aa"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M180 106 C180 95 183 85 189 83 L199 84 C202 94 201 101 197 106 Z"
                            fill={palette.pairFront}
                            style={{ transition: 'fill 0.65s ease' }}
                          />
                          <circle cx="193" cy="71" r="7.8" fill="#fed7aa" />
                          <circle cx="197" cy="70" r="1.2" fill="#0f172a" />
                          <path
                            d="M195 74 Q197.5 75.5 199 74"
                            stroke="#0f172a"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            fill="none"
                          />
                          <path
                            d="M184 72 C184 62 200 61 201 69 C198 65 188 65 185 72 Z"
                            fill="#0f172a"
                          />
                          <g
                            className="passenger-waving-arm"
                            style={{
                              transformOrigin: '196px 87px',
                              transformBox: 'view-box',
                            }}
                          >
                            <path
                              d="M196 87 Q207 81 211 69"
                              stroke="#fed7aa"
                              strokeWidth="3.8"
                              strokeLinecap="round"
                              fill="none"
                            />
                            <circle cx="211" cy="68" r="2.8" fill="#fed7aa" />
                          </g>
                        </g>
                      ) : (
                        <g className="becak-passenger-character">
                          {/* Single Passenger (1 Penumpang - Dynamic Shirt Color) */}
                          <path
                            d="M184 77 L184 86"
                            stroke="#fed7aa"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M172 106 C172 95 175 85 181 83 L191 84 C194 94 193 101 189 106 Z"
                            fill={palette.single}
                            style={{ transition: 'fill 0.65s ease' }}
                          />
                          <circle cx="185" cy="71" r="7.8" fill="#fed7aa" />
                          <circle cx="189" cy="70" r="1.2" fill="#0f172a" />
                          <path
                            d="M187 74 Q189.5 75.5 191 74"
                            stroke="#0f172a"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            fill="none"
                          />
                          <path
                            d="M176 72 C176 62 192 61 193 69 C190 65 180 65 177 72 Z"
                            fill="#0f172a"
                          />
                          <g
                            className="passenger-waving-arm"
                            style={{
                              transformOrigin: '188px 87px',
                              transformBox: 'view-box',
                            }}
                          >
                            <path
                              d="M188 87 Q199 81 203 69"
                              stroke="#fed7aa"
                              strokeWidth="3.8"
                              strokeLinecap="round"
                              fill="none"
                            />
                            <circle cx="203" cy="68" r="2.8" fill="#fed7aa" />
                          </g>
                        </g>
                      )}

                      {/* Main Passenger Cabin Body (Oriented Forward - Facing RIGHT) */}
                      <path
                        d="M270 162 C274 150 272 130 262 116 C252 102 236 96 208 96 L145 96 C136 96 130 102 128 110 L125 162 Z"
                        fill={`url(#bodyGradient-${unit.unitCode})`}
                        stroke="#0284c7"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                      />

                      {/* Curved Passenger Front Apron / Fender */}
                      <path
                        d="M270 156 Q260 164 235 164 L150 164 Q135 164 125 156"
                        stroke="#0ea5e9"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Canopy Frame & Arched Heritage Roof (Connected Flush to Cabin Body) */}
                      <path
                        d="M254 108 L244 34 C240 28 228 25 210 25 L155 25 C142 25 134 32 132 40 L129 106"
                        stroke="#0369a1"
                        strokeWidth="3.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Canopy Fabric Shade */}
                      <path
                        d="M248 34 Q195 18 142 30 L135 46 Q190 38 252 48 Z"
                        fill="#0284c7"
                      />
                      <path
                        d="M248 34 L252 48 L240 47 L237 34 Z M224 32 L226 46 L212 45 L210 31 Z M198 30 L200 44 L186 43 L184 29 Z M172 29 L174 43 L160 42 L158 28 Z M146 29 L148 43 L135 46 L142 30 Z"
                        fill="#38bdf8"
                      />

                      {/* Battery Pack Under Carriage (Glows Cyan) */}
                      <g className="battery-pack">
                        <rect
                          x="158"
                          y="152"
                          width="54"
                          height="14"
                          rx="4"
                          fill="#075985"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <rect
                          x="162"
                          y="155"
                          width="46"
                          height="8"
                          rx="2"
                          fill="#0284c7"
                        />
                        <rect
                          x="166"
                          y="157"
                          width="11"
                          height="4"
                          rx="1"
                          fill="#38bdf8"
                        />
                        <rect
                          x="180"
                          y="157"
                          width="11"
                          height="4"
                          rx="1"
                          fill="#38bdf8"
                        />
                        <rect
                          x="194"
                          y="157"
                          width="11"
                          height="4"
                          rx="1"
                          fill="#4ade80"
                        />
                      </g>

                      {/* Front Wheels (Left & Right Spoke Pair under Passenger - Exact Axle Center 244,164) */}
                      <g
                        className="becak-wheel wheel-front wheel-spinning"
                        style={{
                          transformOrigin: '244px 164px',
                          transformBox: 'view-box',
                        }}
                      >
                        <circle
                          cx="244"
                          cy="164"
                          r="28"
                          stroke="#0f172a"
                          strokeWidth="6"
                          fill="#1e293b"
                        />
                        <circle
                          cx="244"
                          cy="164"
                          r="23"
                          stroke="#e2e8f0"
                          strokeWidth="2"
                          fill="none"
                        />
                        {/* Spokes */}
                        <line
                          x1="244"
                          y1="138"
                          x2="244"
                          y2="190"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="218"
                          y1="164"
                          x2="270"
                          y2="164"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="225"
                          y1="145"
                          x2="263"
                          y2="183"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        <line
                          x1="225"
                          y1="183"
                          x2="263"
                          y2="145"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />
                        {/* Chrome Center Cap */}
                        <circle cx="244" cy="164" r="6" fill="#38bdf8" />
                        <circle cx="244" cy="164" r="3" fill="#ffffff" />
                      </g>

                      {/* High-Power Front LED Headlight */}
                      <g className="headlight-housing">
                        <rect
                          x="266"
                          y="126"
                          width="12"
                          height="16"
                          rx="3"
                          fill="#0f172a"
                          stroke="#0284c7"
                          strokeWidth="2"
                        />
                        <ellipse
                          cx="278"
                          cy="134"
                          rx="3.5"
                          ry="6"
                          fill={lightOn ? '#38bdf8' : '#64748b'}
                        />
                        {lightOn && (
                          <ellipse
                            cx="278"
                            cy="134"
                            rx="1.5"
                            ry="3"
                            fill="#ffffff"
                          />
                        )}
                      </g>

                      {/* Clean BecaKlik Livery Directly on Cabin Side Panel */}
                      <g className="becaklik-cabin-badge">
                        <image
                          href="/logo-becaklik.png"
                          x="148"
                          y="104"
                          width="58"
                          height="38"
                          preserveAspectRatio="xMidYMid meet"
                        />
                      </g>

                      {/* Gradients */}
                      <defs>
                        <linearGradient
                          id={`bodyGradient-${unit.unitCode}`}
                          x1="270"
                          y1="96"
                          x2="125"
                          y2="162"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffffff" />
                          <stop offset="0.75" stopColor="#f0f9ff" />
                          <stop offset="1" stopColor="#e0f2fe" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  );
                })}

              {/* Floating Feature Badges */}
              <div className="floating-badge badge-top-left floating-soft">
                <span
                  style={{
                    width: '44px',
                    height: '32px',
                    borderRadius: '9px',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
                    border: '1.5px solid #bae6fd',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 5px',
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src="/logo-becaklik.png"
                    alt="Logo BecaKlik"
                    width={36}
                    height={23}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </span>
                <div>
                  <strong>BecaKlik Heritage EV</strong>
                  <small>Daya baterai hingga 45 km</small>
                </div>
              </div>

              <div
                className="floating-badge badge-top-right floating-soft"
                style={{ animationDelay: '1.8s' }}
              >
                <span className="badge-icon-cyan">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <strong>Kapasitas 2 Penumpang</strong>
                  <small>Kabin lega & terlindung teduh</small>
                </div>
              </div>
            </div>
            </div>

            {/* Roadside Intersection Group (Meluncur Masuk Saat Jeda, Meluncur Keluar Saat Lanjut) */}
            <div
              className={`roadside-intersection-group ${
                intersectionPhase === 'entering'
                  ? 'intersection-entering'
                  : intersectionPhase === 'stopped'
                  ? 'intersection-stopped'
                  : intersectionPhase === 'departing'
                  ? 'intersection-departing'
                  : 'intersection-hidden'
              }`}
            >
              {/* Garis Marka Putih Berhenti Simpang di Aspal */}
              <div
                className="intersection-stop-line"
                title="Marka Garis Berhenti Simpang Lampu Merah"
              />

              {/* Tiang Lampu Lalu Lintas di Trotoar */}
              <div
                className="intersection-traffic-light"
                onClick={handleTogglePlayPause}
                title={`Sinyal Lampu: ${
                  signalLight === 'GREEN'
                    ? '🟢 HIJAU (Klik untuk Jeda)'
                    : signalLight === 'YELLOW'
                    ? '🟡 KUNING (Mengerem di Simpang)'
                    : '🛑 MERAH (Klik untuk Lanjut Jalan)'
                }`}
              >
                <div className="traffic-signpost-plate">
                  <span>SIMPANG ALUN-ALUN</span>
                </div>

                <div className="traffic-light-hood">
                  {/* RED LENS */}
                  <div className="traffic-visor">
                    <div
                      className={`traffic-lens ${
                        signalLight === 'RED' ? 'lens-red-active' : 'lens-red-dim'
                      }`}
                    />
                  </div>

                  {/* YELLOW LENS */}
                  <div className="traffic-visor">
                    <div
                      className={`traffic-lens ${
                        signalLight === 'YELLOW'
                          ? 'lens-yellow-active'
                          : 'lens-yellow-dim'
                      }`}
                    />
                  </div>

                  {/* GREEN LENS */}
                  <div className="traffic-visor">
                    <div
                      className={`traffic-lens ${
                        signalLight === 'GREEN'
                          ? 'lens-green-active'
                          : 'lens-green-dim'
                      }`}
                    />
                  </div>
                </div>

                <div className="traffic-light-pole" />
                <div className="traffic-light-base" />
              </div>
            </div>

            {/* Asphalt Road Track with Sliding Center Lines */}
            <div className="road-container">
              <div className="road-curb" />
              <div className="road-surface road-moving" />
              <div className="road-bottom-edge" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
