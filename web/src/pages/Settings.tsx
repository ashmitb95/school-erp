import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { School, MapPin, Save, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../contexts/ToastContext';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Input from '../components/Input/Input';
import styles from './Settings.module.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to invalidate map size
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 500),
    ];
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [map]);
  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const Settings: React.FC = () => {
  const { theme, toggleTheme, colors, setColors } = useTheme();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const schoolId = user?.school_id;

  // Fetch school data
  const { data: schoolData, isLoading: isLoadingSchool } = useQuery(
    ['school', schoolId],
    async () => {
      if (!schoolId) return null;
      const response = await api.get(`/management/schools/${schoolId}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  // Get current school location
  const currentLocation = React.useMemo(() => {
    if (!schoolData?.settings?.location) return null;
    const loc = schoolData.settings.location;
    if (loc.lat && loc.lng) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  }, [schoolData]);

  const [schoolLocation, setSchoolLocation] = useState<{ lat: number; lng: number } | null>(currentLocation);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    currentLocation ? [currentLocation.lat, currentLocation.lng] : [28.6139, 77.2090]
  );

  // Update location when school data loads
  useEffect(() => {
    if (currentLocation) {
      setSchoolLocation(currentLocation);
      setMapCenter([currentLocation.lat, currentLocation.lng]);
    }
  }, [currentLocation]);

  // Handle map click to set school location
  const handleMapClick = (lat: number, lng: number) => {
    setSchoolLocation({ lat, lng });
  };

  // Save school location mutation
  const saveLocationMutation = useMutation(
    async (location: { lat: number; lng: number }) => {
      if (!schoolId) throw new Error('School ID is required');
      
      const currentSettings = schoolData?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        location: {
          lat: location.lat,
          lng: location.lng,
        },
      };

      const response = await api.put(`/management/schools/${schoolId}`, {
        settings: updatedSettings,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        showSuccess('School location saved successfully!');
        queryClient.invalidateQueries(['school', schoolId]);
        queryClient.invalidateQueries(['transport-routes']); // Invalidate routes to refresh
      },
      onError: (error: any) => {
        showError(error?.response?.data?.error || 'Failed to save school location');
      },
    }
  );

  const handleSaveLocation = () => {
    if (!schoolLocation) {
      showError('Please set the school location on the map');
      return;
    }
    saveLocationMutation.mutate(schoolLocation);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>School Location</h2>
        <p className={styles.sectionDescription}>
          Set your school's location on the map. This is required for transport route planning.
          Click on the map to set the location.
        </p>
        
        {!schoolLocation && (
          <div className={styles.warningBanner}>
            <AlertCircle size={16} />
            <span>School location is not set. Please set it to enable transport route features.</span>
          </div>
        )}

        <div className={styles.locationMapContainer}>
          <MapContainer
            center={mapCenter}
            zoom={schoolLocation ? 15 : 12}
            style={{ height: '400px', width: '100%', borderRadius: 'var(--radius-md)' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInvalidateSize />
            <MapClickHandler onMapClick={handleMapClick} />

            {schoolLocation && (
              <Marker
                position={[schoolLocation.lat, schoolLocation.lng]}
                icon={L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                })}
              >
                <Popup>
                  <strong>School Location</strong>
                  <br />
                  <small>{schoolLocation.lat.toFixed(6)}, {schoolLocation.lng.toFixed(6)}</small>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {schoolLocation && (
          <div className={styles.locationInfo}>
            <div className={styles.locationInfoItem}>
              <MapPin size={16} />
              <div>
                <strong>Latitude:</strong> {schoolLocation.lat.toFixed(6)}
              </div>
            </div>
            <div className={styles.locationInfoItem}>
              <MapPin size={16} />
              <div>
                <strong>Longitude:</strong> {schoolLocation.lng.toFixed(6)}
              </div>
            </div>
          </div>
        )}

        <div className={styles.locationActions}>
          <Button
            onClick={handleSaveLocation}
            loading={saveLocationMutation.isLoading}
            disabled={!schoolLocation}
            icon={<Save size={18} />}
          >
            Save School Location
          </Button>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.setting}>
          <div>
            <label>Theme</label>
            <p>Switch between light and dark mode</p>
          </div>
          <Button variant="outline" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </Button>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Theme Colors</h2>
        <div className={styles.colorGrid}>
          {Object.entries(colors).map(([key, value]) => (
            <div key={key} className={styles.colorItem}>
              <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="color"
                value={value}
                onChange={(e) => setColors({ [key]: e.target.value })}
                className={styles.colorInput}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Settings;
