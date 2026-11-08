'use client';

import React, { useEffect, useState } from 'react';
import type { InteractiveMapProps } from './InteractiveMap';

let cachedMapComponent: React.ComponentType<InteractiveMapProps> | null = null;

if (typeof window !== 'undefined') {
  void import('./InteractiveMap')
    .then((mod) => {
      cachedMapComponent = mod.default;
    })
    .catch(() => {});
}

export default function MapWrapper(props: InteractiveMapProps) {
  const [MapComp, setMapComp] =
    useState<React.ComponentType<InteractiveMapProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    if (cachedMapComponent) {
      const Cached = cachedMapComponent;
      Promise.resolve().then(() => {
        if (mounted) {
          setMapComp(() => Cached);
        }
      });
      return () => {
        mounted = false;
      };
    }

    import('./InteractiveMap')
      .then((mod) => {
        cachedMapComponent = mod.default;
        if (mounted) {
          setMapComp(() => mod.default);
        }
      })
      .catch((err) => {
        console.error('Error loading InteractiveMap:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!MapComp) {
    return (
      <div
        style={{
          width: '100%',
          height: props.height || '440px',
          minHeight: '340px',
          background:
            'radial-gradient(circle at 50% 50%, #f0f9ff 0%, #e0f2fe 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0369a1',
          gap: '10px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            border: '3px solid #bae6fd',
            borderTopColor: '#0284c7',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
          Memuat Peta Operasional Majalengka...
        </span>
      </div>
    );
  }

  return <MapComp {...props} />;
}
