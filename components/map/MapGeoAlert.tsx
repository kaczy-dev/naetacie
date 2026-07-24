'use client';

import { useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useToast } from '@/components/feedback/ToastProvider';

export interface SavedGeoAlert {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  createdAt: string;
}

export interface MapGeoAlertProps {
  map: maplibregl.Map | null;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
}

export function MapGeoAlert({ map, ui }: MapGeoAlertProps) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [alertName, setAlertName] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [savedAlerts, setSavedAlerts] = useState<SavedGeoAlert[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('naetacie_geo_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSaveAlert = () => {
    if (!map) return;
    const center = map.getCenter();
    const name = alertName.trim() || `Strefa (${center.lat.toFixed(2)}, ${center.lng.toFixed(2)})`;

    const newAlert: SavedGeoAlert = {
      id: `alert_${Date.now()}`,
      name,
      lat: center.lat,
      lng: center.lng,
      radiusKm,
      createdAt: new Date().toISOString(),
    };

    const updated = [newAlert, ...savedAlerts];
    setSavedAlerts(updated);
    try {
      localStorage.setItem('naetacie_geo_alerts', JSON.stringify(updated));
    } catch {
      /* ignore */
    }

    show('success', `🔔 Powiadomienie aktywne dla strefy "${name}" (${radiusKm} km)`);

    setAlertName('');
    setOpen(false);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = savedAlerts.filter((a) => a.id !== id);
    setSavedAlerts(updated);
    try {
      localStorage.setItem('naetacie_geo_alerts', JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    show('info', 'Strefa usunięta — powiadomienia wyłączone');
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '472px',
        right: '10px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        title="Powiadomienia przestrzenne (Geo-Alerty)"
        style={{
          width: '44px',
          height: '44px',
          background: ui.surface,
          border: `1px solid ${ui.border}`,
          borderRadius: '12px',
          boxShadow: ui.shadow,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: ui.text,
          transition: 'transform 0.15s ease',
        }}
      >
        🔔
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: '46px',
            background: ui.surface,
            border: `1.5px solid ${ui.border}`,
            borderRadius: '14px',
            boxShadow: ui.shadow,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '240px',
            fontSize: '12px',
            color: ui.text,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px' }}>🔔 Geo-Alerty Ofert</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600 }}>Nazwa obszaru:</label>
            <input
              type="text"
              placeholder="np. Moja dzielnica"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: `1px solid ${ui.border}`,
                background: 'transparent',
                color: ui.text,
                fontSize: '12px',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
              <span>Promień alertu:</span>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={handleSaveAlert}
            style={{
              padding: '8px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Zapisz obecny obszar
          </button>

          {savedAlerts.length > 0 && (
            <div style={{ borderTop: `1px solid ${ui.border}`, paddingTop: '8px', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                Zapisane strefy ({savedAlerts.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                {savedAlerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      background: 'rgba(156,163,175,0.1)',
                      fontSize: '11px',
                    }}
                  >
                    <span>📍 {a.name} ({a.radiusKm} km)</span>
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
