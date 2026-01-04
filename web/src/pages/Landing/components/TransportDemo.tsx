import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Bus, Users, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './TransportDemo.module.css';

// Component to fit map bounds
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);
  return null;
}

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

// Helper function to parse coordinates from location string
const parseLocationString = (locationStr: string): [number, number] | null => {
  if (!locationStr) return null;
  
  const latMatch = locationStr.match(/Lat:\s*([\d.]+)/i);
  const lngMatch = locationStr.match(/Lng:\s*([\d.]+)/i);
  
  if (latMatch && lngMatch) {
    const lat = parseFloat(latMatch[1]);
    const lng = parseFloat(lngMatch[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }
  
  return null;
};

// Demo route data - using actual route structure from API
const demoRouteData = {
  route_name: 'South Route',
  route_number: 'RT002',
  vehicle_number: 'DL-12-AB-123',
  vehicle_type: 'Bus',
  student_count: 23,
  start_location: 'Lat: 28.603249, Lng: 77.182732',
  end_location: 'Schiller - Grimes School - Branch 1',
  stops: [
    '{"name":"Stop 4","lat":28.603249242712884,"lng":77.18273162841798}',
    '{"name":"Stop 3","lat":28.609654269489603,"lng":77.19157218933107}',
    '{"name":"Stop 1","lat":28.610888134199307,"lng":77.2119140625}',
    '{"name":"Stop 2","lat":28.62656919757239,"lng":77.20676422119142}',
  ],
  school: {
    settings: {
      location: {
        lat: 28.6159882685116,
        lng: 77.21843719482423,
      },
    },
  },
};

const TransportDemo: React.FC = () => {
  const [mapKey, setMapKey] = useState(0);

  // Parse route coordinates from the demo data
  const routeCoordinates = useMemo(() => {
    // Parse stops from JSON strings
    const stops: Array<{ name: string; coords: [number, number] }> = [];
    if (demoRouteData.stops && Array.isArray(demoRouteData.stops)) {
      demoRouteData.stops.forEach((stopStr: string) => {
        try {
          const stopData = typeof stopStr === 'string' ? JSON.parse(stopStr) : stopStr;
          if (stopData.lat && stopData.lng) {
            stops.push({
              name: stopData.name || `Stop ${stops.length + 1}`,
              coords: [stopData.lat, stopData.lng],
            });
          }
        } catch (e) {
          console.warn('Failed to parse stop:', stopStr);
        }
      });
    }

    // Parse start coordinates from start_location string
    const start = parseLocationString(demoRouteData.start_location) || [28.603249, 77.182732];

    // Use school location as end point
    const end: [number, number] = demoRouteData.school?.settings?.location
      ? [demoRouteData.school.settings.location.lat, demoRouteData.school.settings.location.lng]
      : [28.615988, 77.218437];

    // Construct route points: start -> stops -> end
    const allPoints: [number, number][] = [
      start,
      ...stops.map(s => s.coords),
      end,
    ];

    return {
      start,
      end,
      stops,
      allPoints,
    };
  }, []);

  const startPoint: [number, number] = routeCoordinates.start;
  const endPoint: [number, number] = routeCoordinates.end;
  const stopPoints = routeCoordinates.stops;

  // Force map re-render when component mounts
  useEffect(() => {
    // Multiple re-renders to ensure map initializes properly
    const timers = [
      setTimeout(() => setMapKey(prev => prev + 1), 100),
      setTimeout(() => setMapKey(prev => prev + 1), 300),
      setTimeout(() => setMapKey(prev => prev + 1), 500),
      setTimeout(() => setMapKey(prev => prev + 1), 1000),
    ];
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Debug: log route coordinates
  useEffect(() => {
    console.log('TransportDemo: routeCoordinates', routeCoordinates);
    console.log('TransportDemo: mapKey', mapKey);
  }, [routeCoordinates, mapKey]);

  // Map component for transport route visualization
  return (
    <div className={styles.transportDemo}>
      <div className={styles.transportHeader}>
        <div className={styles.transportInfo}>
          <h3 className={styles.transportTitle}>{demoRouteData.route_name}</h3>
          <div className={styles.transportMeta}>
            <div className={styles.transportMetaItem}>
              <Bus size={16} />
              <span>{demoRouteData.vehicle_number} ({demoRouteData.vehicle_type})</span>
            </div>
            <div className={styles.transportMetaItem}>
              <Users size={16} />
              <span>{demoRouteData.student_count || 0} students</span>
            </div>
            <div className={styles.transportMetaItem}>
              <Navigation size={16} />
              <span>{stopPoints.length} stops</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mapContainer} style={{ position: 'relative', minHeight: '400px', height: '400px' }}>
        {routeCoordinates && routeCoordinates.allPoints.length > 0 ? (
          <MapContainer
            key={`transport-demo-map-${mapKey}`}
            center={routeCoordinates.start}
            zoom={12}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            scrollWheelZoom={false}
            whenReady={(map) => {
              // Force invalidate size when ready
              setTimeout(() => {
                map.target.invalidateSize();
              }, 100);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInvalidateSize />
            <FitBounds points={routeCoordinates.allPoints} />

            {/* Start marker */}
            <Marker position={startPoint}>
              <Popup>
                <strong>Start: {demoRouteData.start_location}</strong>
              </Popup>
            </Marker>

            {/* End marker */}
            <Marker position={endPoint}>
              <Popup>
                <strong>End: {demoRouteData.end_location}</strong>
              </Popup>
            </Marker>

            {/* Stop markers */}
            {stopPoints.map((stop, index) => (
              <Marker key={index} position={stop.coords}>
                <Popup>
                  <strong>{stop.name}</strong>
                  <br />
                  <small>{stop.coords[0].toFixed(6)}, {stop.coords[1].toFixed(6)}</small>
                </Popup>
              </Marker>
            ))}

            {/* Route polyline */}
            <Polyline
              positions={routeCoordinates.allPoints}
              pathOptions={{
                color: '#6366f1',
                weight: 4,
                opacity: 0.7,
              }}
            />
          </MapContainer>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--color-text-secondary)'
          }}>
            Loading map...
          </div>
        )}
      </div>

      <div className={styles.transportStats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{demoRouteData.student_count || 0}</div>
          <div className={styles.statLabel}>Students</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stopPoints.length}</div>
          <div className={styles.statLabel}>Stops</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{demoRouteData.route_number}</div>
          <div className={styles.statLabel}>Route Number</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{demoRouteData.vehicle_type}</div>
          <div className={styles.statLabel}>Vehicle Type</div>
        </div>
      </div>
    </div>
  );
};

export default TransportDemo;

