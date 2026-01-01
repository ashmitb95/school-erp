import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Bus, Users, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './TransportDemo.module.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to invalidate map size when container is ready
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    // Invalidate size multiple times to ensure it renders
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 500),
      setTimeout(() => map.invalidateSize(), 1000),
    ];
    
    // Also invalidate on window resize
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

// Demo route data
const demoRoute = {
  name: 'Route 12 - North Delhi',
  vehicle: 'DL-01-AB-1234',
  students: 45,
  stops: 8,
};

const TransportDemo: React.FC = () => {
  const [mapKey, setMapKey] = useState(0);

  // Force map re-render when component mounts or becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Map component for transport route visualization
  return (
    <div className={styles.transportDemo}>
      <div className={styles.transportHeader}>
        <div className={styles.transportInfo}>
          <h3 className={styles.transportTitle}>{demoRoute.name}</h3>
          <div className={styles.transportMeta}>
            <div className={styles.transportMetaItem}>
              <Bus size={16} />
              <span>{demoRoute.vehicle}</span>
            </div>
            <div className={styles.transportMetaItem}>
              <Users size={16} />
              <span>{demoRoute.students} students</span>
            </div>
            <div className={styles.transportMetaItem}>
              <Navigation size={16} />
              <span>{demoRoute.stops} stops</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mapContainer}>
        <MapContainer
          key={`transport-demo-map-${mapKey}`}
          center={[28.6139, 77.2090]}
          zoom={12}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={false}
          whenReady={() => {
            // Map is ready, MapInvalidateSize will handle size invalidation
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInvalidateSize />
        </MapContainer>
      </div>

      <div className={styles.transportStats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{demoRoute.students}</div>
          <div className={styles.statLabel}>Students</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{demoRoute.stops}</div>
          <div className={styles.statLabel}>Stops</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>12.5 km</div>
          <div className={styles.statLabel}>Route Distance</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>45 min</div>
          <div className={styles.statLabel}>Avg. Duration</div>
        </div>
      </div>
    </div>
  );
};

export default TransportDemo;

