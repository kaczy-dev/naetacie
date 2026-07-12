'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MaskedAnnouncement } from '@/lib/types/announcement';
import { filterGeocodedAnnouncements, formatPrice } from './utils';

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// Szczecin coordinates and default zoom
const SZCZECIN_CENTER: [number, number] = [53.4285, 14.5528];
const DEFAULT_ZOOM = 10;

export interface MapComponentProps {
  announcements: MaskedAnnouncement[];
  onMarkerClick?: (id: string) => void;
}

export default function MapComponent({
  announcements,
  onMarkerClick,
}: MapComponentProps) {
  const geocodedAnnouncements = filterGeocodedAnnouncements(announcements);

  return (
    <MapContainer
      center={SZCZECIN_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {geocodedAnnouncements.map((announcement) => (
          <Marker
            key={announcement.deduplication_key}
            position={[announcement.latitude!, announcement.longitude!]}
            eventHandlers={{
              click: () => {
                onMarkerClick?.(announcement.deduplication_key);
              },
            }}
          >
            <Popup>
              <div className="map-popup">
                <h3 className="map-popup__title">{announcement.title}</h3>
                <p className="map-popup__location">
                  {announcement.location_text}
                </p>
                <p className="map-popup__price">
                  {formatPrice(announcement.price)}
                </p>
                <a
                  href={`/announcements/${announcement.deduplication_key}`}
                  className="map-popup__link"
                >
                  View details
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
