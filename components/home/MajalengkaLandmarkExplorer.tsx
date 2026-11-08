"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, ArrowRight, Clock3, Sparkles } from "lucide-react";

interface LandmarkItem {
  id: string;
  name: string;
  category: string;
  badge: string;
  distance: string;
  duration: string;
  fare: string;
  desc: string;
  highlights: string[];
  gradient: string;
  lat: number;
  lng: number;
}

const LANDMARKS: LandmarkItem[] = [
  {
    id: "alun-alun",
    name: "Alun-Alun & Masjid Agung Al-Imam",
    category: "PUSAT KOTA & HERITAGE",
    badge: "Titik Nol Majalengka",
    distance: "0.0 km (Pangkalan Utama)",
    duration: "Pusat Transit",
    fare: "Pangkalan Siaga",
    desc: "Ruang publik hijau kebanggaan Majalengka dengan arsitektur masjid megah bercorak terakota khas Sunda dan area santai keluarga.",
    highlights: [
      "Pangkalan Becak Listrik Siaga",
      "Pusat Oleh-oleh & UMKM",
      "Taman Bunga Asri",
    ],
    gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    lat: -6.8362,
    lng: 108.2281,
  },
  {
    id: "munjul",
    name: "Bunderan Munjul & Tugu Bola Dunia",
    category: "LANDMARK IKONIK",
    badge: "Spot Foto Wisatawan",
    distance: "1.6 km dari Alun-Alun",
    duration: "± 8 Menit",
    fare: "Rp9.800",
    desc: "Simbol kemajuan Majalengka dengan replika bola dunia raksasa menyerupai Universal Studios, dikelilingi taman air mancur indah.",
    highlights: [
      "Spot Foto Favorit Malam Hari",
      "Akses Koridor Jl. KH Abdul Halim",
      "Trotoar Ramah Pejalan",
    ],
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    lat: -6.8295,
    lng: 108.2198,
  },
  {
    id: "gedung-juang",
    name: "Gedung Juang 45 Majalengka",
    category: "CAGAR BUDAYA & SEJARAH",
    badge: "Edukasi Budaya",
    distance: "1.2 km dari Alun-Alun",
    duration: "± 6 Menit",
    fare: "Rp8.600",
    desc: "Bangunan cagar budaya bersejarah masa kolonial yang kini difungsikan sebagai ruang pamer arsip sejarah perjuangan rakyat Majalengka.",
    highlights: [
      "Galeri Sejarah Kemerdekaan",
      "Arsitektur Kolonial Belanda",
      "Taman Terakota",
    ],
    gradient: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
    lat: -6.8341,
    lng: 108.2255,
  },
  {
    id: "dirgantara",
    name: "Taman Dirgantara Munjul",
    category: "WISATA EDUKASI & KELUARGA",
    badge: "Monumen MiG-17",
    distance: "2.2 km dari Alun-Alun",
    duration: "± 11 Menit",
    fare: "Rp11.600",
    desc: "Monumen pesawat tempur legendaris TNI-AU MiG-17 Fresco di ruang terbuka hijau ramah anak dengan jogging track nyaman.",
    highlights: [
      "Pesawat Tempur Asli TNI-AU",
      "Area Bermain Anak",
      "Pusat Jajanan Ramah Kantong",
    ],
    gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    lat: -6.8278,
    lng: 108.2185,
  },
  {
    id: "pasar-mambo",
    name: "Pasar Mambo Kuliner Legendaris",
    category: "SENTRA KULINER MAJALENGKA",
    badge: "Pusat Jajanan Malam",
    distance: "0.8 km dari Alun-Alun",
    duration: "± 4 Menit",
    fare: "Rp7.400",
    desc: "Kawasan legendaris surga kuliner malam Majalengka, menyajikan aneka jajanan tradisional, serabi oncom, dan wedang ronde hangat.",
    highlights: [
      "Serabi Oncom Hangat",
      "Jalakotek & Tutug Oncom",
      "Buka Sore hingga Malam",
    ],
    gradient: "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
    lat: -6.8349,
    lng: 108.2305,
  },
];

export default function MajalengkaLandmarkExplorer() {
  const [activeLandmark, setActiveLandmark] = useState<LandmarkItem>(
    LANDMARKS[1],
  );

  // Deep-link: route through login first while forwarding destination params to the booking page
  const bookingHref = `/login?role=pelanggan&tujuan=${encodeURIComponent(activeLandmark.name)}&lat=${activeLandmark.lat}&lng=${activeLandmark.lng}`;

  return (
    <div style={{ marginTop: "28px" }}>
      {/* Category Pills Navigation */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "14px",
          marginBottom: "20px",
          scrollbarWidth: "none",
        }}
      >
        {LANDMARKS.map((item) => {
          const isSelected = activeLandmark.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveLandmark(item)}
              style={{
                background: isSelected ? "#0284c7" : "#ffffff",
                color: isSelected ? "#ffffff" : "#475569",
                border: isSelected ? "1px solid #0284c7" : "1px solid #e2e8f0",
                padding: "10px 18px",
                borderRadius: "30px",
                fontWeight: 700,
                fontSize: "13px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: isSelected
                  ? "0 4px 14px rgba(2, 132, 199, 0.25)"
                  : "none",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
            >
              <MapPin size={15} color={isSelected ? "#ffffff" : "#0ea5e9"} />
              {item.name.split("&")[0].trim()}
            </button>
          );
        })}
      </div>

      {/* Featured Landmark Card */}
      <div
        className="landmark-explorer-card"
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
          gap: "0px",
        }}
      >
        {/* Left Column: Visual & Landmark Info */}
        <div
          className="landmark-col-left"
          style={{
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  background: "#f0f9ff",
                  color: "#0284c7",
                  border: "1px solid #bae6fd",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                {activeLandmark.category}
              </span>
              <span
                style={{
                  background: "#f8fafc",
                  color: "#64748b",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {activeLandmark.badge}
              </span>
            </div>

            <h3
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 12px 0",
              }}
            >
              {activeLandmark.name}
            </h3>

            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              {activeLandmark.desc}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f172a",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                DAYA TARIK &amp; KEISTIMEWAAN:
              </span>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {activeLandmark.highlights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                      color: "#334155",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "6px",
                        background: "#f0f9ff",
                        color: "#0284c7",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={12} />
                    </div>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={bookingHref}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                padding: "12px 22px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.2)",
              }}
            >
              Pesan Becak ke Lokasi Ini <ArrowRight size={16} />
            </Link>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              📍 Kawasan Perkotaan Majalengka
            </span>
          </div>
        </div>

        {/* Right Column: Distance, Fare & Heritage Route Specs */}
        <div
          className="landmark-col-right"
          style={{
            background: "#f8fafc",
            borderLeft: "1px solid #e2e8f0",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Jarak Tempuh
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Navigation size={18} color="#0284c7" />
              {activeLandmark.distance}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Estimasi Waktu Hening
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Clock3 size={18} color="#0ea5e9" />
              {activeLandmark.duration}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #bae6fd",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#0369a1",
                textTransform: "uppercase",
              }}
            >
              Estimasi Tarif Resmi
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#0284c7",
                marginTop: "4px",
              }}
            >
              {activeLandmark.fare}
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#0369a1",
                display: "block",
                marginTop: "2px",
              }}
            >
              Transparan via QRIS &amp; Tunai
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
