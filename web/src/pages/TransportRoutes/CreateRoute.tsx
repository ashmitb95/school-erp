import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { ArrowLeft, Plus, X, MapPin, Trash2, Navigation, School, AlertCircle, Sparkles, Settings, Loader } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Card from '../../components/Card/Card';
import { getRouteWithWaypoints, getDistanceFromSchool, getRoute, calculateDistance } from '../../utils/routing';
import styles from './CreateRoute.module.css';

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

// Component to fit bounds
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

interface StopWithCoords {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  center: { lat: number; lng: number };
  zoom: number;
}

type RouteType = 'shift_start' | 'shift_end';

const CreateRoute: React.FC = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const isEditMode = !!routeId;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const schoolId = user?.school_id;
  const mapRef = useRef<L.Map | null>(null);

  // Fetch school data to get location
  const { data: schoolData } = useQuery(
    ['school', schoolId],
    async () => {
      if (!schoolId) return null;
      const response = await api.get(`/management/schools/${schoolId}`);
      return response.data;
    },
    { enabled: !!schoolId }
  );

  // Fetch existing route data if in edit mode
  const { data: existingRoute, isLoading: isLoadingExistingRoute } = useQuery(
    ['transport-route', routeId],
    async () => {
      if (!routeId) return null;
      const response = await api.get(`/management/transport-routes/${routeId}`);
      return response.data;
    },
    { enabled: isEditMode && !!routeId }
  );

  // Get school location from settings
  const schoolLocation = React.useMemo(() => {
    if (!schoolData?.settings?.location) return null;
    const loc = schoolData.settings.location;
    if (loc.lat && loc.lng) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  }, [schoolData]);

  const [routeType, setRouteType] = useState<RouteType>('shift_start');
  const [formData, setFormData] = useState({
    route_name: '',
    route_number: '',
    driver_name: '',
    driver_phone: '',
    vehicle_number: '',
    vehicle_type: 'Bus',
    capacity: 40,
    start_location: '',
    end_location: '',
    fare_per_km: 10, // Default fare per kilometer
  });

  const [maxDistanceFromSchool, setMaxDistanceFromSchool] = useState<number>(0); // in meters
  const [calculatedFare, setCalculatedFare] = useState<number>(0);

  const [stops, setStops] = useState<StopWithCoords[]>([]);
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [roadRoute, setRoadRoute] = useState<[number, number][] | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Default center (Delhi) or school location
  const defaultCenter: [number, number] = schoolLocation 
    ? [schoolLocation.lat, schoolLocation.lng]
    : [28.6139, 77.2090];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);

  // Load existing route data when in edit mode
  useEffect(() => {
    if (isEditMode && existingRoute) {
      // Load form data
      setFormData({
        route_name: existingRoute.route_name || '',
        route_number: existingRoute.route_number || '',
        driver_name: existingRoute.driver_name || '',
        driver_phone: existingRoute.driver_phone || '',
        vehicle_number: existingRoute.vehicle_number || '',
        vehicle_type: existingRoute.vehicle_type || 'Bus',
        capacity: existingRoute.capacity || 40,
        start_location: existingRoute.start_location || '',
        end_location: existingRoute.end_location || '',
        fare_per_km: existingRoute.fare_per_km || 10,
      });

      // Load route type
      if (existingRoute.route_type) {
        setRouteType(existingRoute.route_type);
      }

      // Load start and end points
      if (existingRoute.start_coordinates) {
        setStartPoint({
          lat: existingRoute.start_coordinates.lat,
          lng: existingRoute.start_coordinates.lng,
        });
      }
      if (existingRoute.end_coordinates) {
        setEndPoint({
          lat: existingRoute.end_coordinates.lat,
          lng: existingRoute.end_coordinates.lng,
        });
      }

      // Load stops
      if (existingRoute.stops && Array.isArray(existingRoute.stops)) {
        const loadedStops: StopWithCoords[] = existingRoute.stops.map((stopStr: string, index: number) => {
          try {
            const stopData = typeof stopStr === 'string' ? JSON.parse(stopStr) : stopStr;
            return {
              id: `stop-${index}-${Date.now()}`,
              name: stopData.name || `Stop ${index + 1}`,
              lat: stopData.lat,
              lng: stopData.lng,
            };
          } catch {
            // Fallback if parsing fails
            return {
              id: `stop-${index}-${Date.now()}`,
              name: `Stop ${index + 1}`,
              lat: 28.6139,
              lng: 77.2090,
            };
          }
        });
        setStops(loadedStops);
      }

      // Load map bounds if available
      if (existingRoute.map_bounds) {
        setMapBounds(existingRoute.map_bounds);
        if (existingRoute.map_bounds.center) {
          setMapCenter([existingRoute.map_bounds.center.lat, existingRoute.map_bounds.center.lng]);
          setMapZoom(existingRoute.map_bounds.zoom || 12);
        }
      }

      // Load route coordinates if available
      if (existingRoute.route_coordinates && Array.isArray(existingRoute.route_coordinates)) {
        setRoadRoute(existingRoute.route_coordinates);
      }
    }
  }, [isEditMode, existingRoute]);

  // Auto-set school location based on route type (only if not in edit mode or no existing data)
  useEffect(() => {
    if (schoolLocation && (!isEditMode || !existingRoute)) {
      if (routeType === 'shift_start') {
        // Shift start: school is the destination (end point)
        setEndPoint(schoolLocation);
        setFormData(prev => ({ 
          ...prev, 
          end_location: schoolData?.name || 'School' 
        }));
        if (!startPoint) {
          // Clear start point if it was school
          setStartPoint(null);
          setFormData(prev => ({ ...prev, start_location: '' }));
        }
      } else {
        // Shift end: school is the source (start point)
        setStartPoint(schoolLocation);
        setFormData(prev => ({ 
          ...prev, 
          start_location: schoolData?.name || 'School' 
        }));
        if (!endPoint) {
          // Clear end point if it was school
          setEndPoint(null);
          setFormData(prev => ({ ...prev, end_location: '' }));
        }
      }
    }
  }, [routeType, schoolLocation, schoolData, isEditMode, existingRoute, startPoint, endPoint]);

  // Calculate distance from school and fare
  useEffect(() => {
    const calculateDistanceAndFare = async () => {
      if (!schoolLocation || (!startPoint && !endPoint)) {
        setMaxDistanceFromSchool(0);
        setCalculatedFare(0);
        return;
      }

      setIsLoadingRoute(true);
      try {
        const distances: number[] = [];

        // Calculate distance from school to start point (if not school)
        if (startPoint && (!schoolLocation || 
            startPoint.lat !== schoolLocation.lat || startPoint.lng !== schoolLocation.lng)) {
          const dist = await getDistanceFromSchool(
            [schoolLocation.lat, schoolLocation.lng],
            [startPoint.lat, startPoint.lng]
          );
          distances.push(dist);
        }

        // Calculate distance from school to end point (if not school)
        if (endPoint && (!schoolLocation || 
            endPoint.lat !== schoolLocation.lat || endPoint.lng !== schoolLocation.lng)) {
          const dist = await getDistanceFromSchool(
            [schoolLocation.lat, schoolLocation.lng],
            [endPoint.lat, endPoint.lng]
          );
          distances.push(dist);
        }

        // Calculate distance from school to each stop
        for (const stop of stops) {
          const dist = await getDistanceFromSchool(
            [schoolLocation.lat, schoolLocation.lng],
            [stop.lat, stop.lng]
          );
          distances.push(dist);
        }

        // Get maximum distance (furthest point from school)
        const maxDist = distances.length > 0 ? Math.max(...distances) : 0;
        setMaxDistanceFromSchool(maxDist);

        // Calculate fare: fare_per_km × distance_in_km
        const distanceInKm = maxDist / 1000; // Convert meters to kilometers
        const fare = formData.fare_per_km * distanceInKm;
        setCalculatedFare(fare);
      } catch (error) {
        console.error('Error calculating distance:', error);
        setMaxDistanceFromSchool(0);
        setCalculatedFare(0);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    calculateDistanceAndFare();
  }, [schoolLocation, startPoint, endPoint, stops, formData.fare_per_km]);

  // Fetch road-based route when points change
  useEffect(() => {
    const fetchRoute = async () => {
      // Build waypoints list: start -> stops -> end
      const waypoints: [number, number][] = [];
      
      if (startPoint) {
        waypoints.push([startPoint.lat, startPoint.lng]);
      }
      
      // Add all stops
      stops.forEach(stop => {
        waypoints.push([stop.lat, stop.lng]);
      });
      
      if (endPoint) {
        waypoints.push([endPoint.lat, endPoint.lng]);
      }

      // Need at least 2 points to draw a route
      if (waypoints.length < 2) {
        setRoadRoute(null);
        return;
      }

      setIsLoadingRoute(true);
      try {
        // If we have start and end, use the full route calculation
        if (startPoint && endPoint) {
          const stopCoords: [number, number][] = stops.map(s => [s.lat, s.lng]);
          const routeResult = await getRouteWithWaypoints(
            [startPoint.lat, startPoint.lng],
            stopCoords,
            [endPoint.lat, endPoint.lng]
          );
          setRoadRoute(routeResult.route);
        } else {
          // If we only have stops or partial points, calculate route through all waypoints
          const routeResult = await getRoute(waypoints);
          setRoadRoute(routeResult.route);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        setRoadRoute(null);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    // Add a small delay to debounce rapid pin additions
    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [startPoint, endPoint, stops]);

  // Component to capture map reference and bounds
  const MapBoundsCapture = () => {
    const map = useMap();
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
      mapRef.current = map;
      
      const updateBounds = () => {
        // Clear any pending updates
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Debounce the update to prevent rapid state changes
        updateTimeoutRef.current = setTimeout(() => {
          try {
            const bounds = map.getBounds();
            const center = map.getCenter();
            setMapBounds({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
              center: { lat: center.lat, lng: center.lng },
              zoom: map.getZoom(),
            });
          } catch (error) {
            console.error('Error updating map bounds:', error);
          }
        }, 200); // Debounce by 200ms
      };
      
      map.on('moveend', updateBounds);
      // Initial bounds with a delay to avoid immediate update
      const initialTimeout = setTimeout(updateBounds, 300);
      
      return () => {
        clearTimeout(initialTimeout);
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        map.off('moveend', updateBounds);
      };
    }, [map]); // Only depend on map instance
    return null;
  };

  // Handle map click to add stop
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const stopId = `stop-${Date.now()}`;
    const newStop: StopWithCoords = {
      id: stopId,
      name: `Stop ${stops.length + 1}`,
      lat,
      lng,
    };
    setStops([...stops, newStop]);
    setEditingStopId(stopId);
    setNewStopName(newStop.name);
  }, [stops]);

  // Update stop name
  const updateStopName = useCallback((id: string, name: string) => {
    setStops(stops.map(stop => stop.id === id ? { ...stop, name } : stop));
    setEditingStopId(null);
    setNewStopName('');
  }, [stops]);

  // Remove stop
  const removeStop = useCallback((id: string) => {
    setStops(stops.filter(stop => stop.id !== id));
  }, [stops]);

  // Optimize route using nearest-neighbor algorithm
  const optimizeRoute = useCallback(async () => {
    if (!startPoint || !endPoint) {
      showError(
        routeType === 'shift_start'
          ? 'Please set the start point on the map. End point (school) will be set automatically.'
          : 'Please set the end point on the map. Start point (school) will be set automatically.'
      );
      return;
    }
    
    if (stops.length < 2) {
      showError('Need at least 2 stops to optimize route');
      return;
    }

    setIsOptimizing(true);
    setIsLoadingRoute(true);
    try {
      // Create a copy of stops with their coordinates for distance calculation
      const stopsWithCoords = stops.map(stop => ({
        stop,
        coords: [stop.lat, stop.lng] as [number, number],
      }));

      // Nearest-neighbor algorithm
      const optimizedStops: StopWithCoords[] = [];
      const unvisited = [...stopsWithCoords];
      let currentPoint: [number, number] = [startPoint.lat, startPoint.lng];

      // Visit each stop by finding the nearest unvisited stop
      while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = calculateDistance(currentPoint, unvisited[0].coords);

        // Find the nearest unvisited stop
        for (let i = 1; i < unvisited.length; i++) {
          const distance = calculateDistance(currentPoint, unvisited[i].coords);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }

        // Move to the nearest stop
        const nearestItem = unvisited.splice(nearestIndex, 1)[0];
        optimizedStops.push(nearestItem.stop); // Push only the stop object, not the wrapper
        currentPoint = nearestItem.coords;
      }

      // Update stops with optimized order
      setStops(optimizedStops);
      
      // Explicitly recalculate the route with the new order
      const stopCoords: [number, number][] = optimizedStops.map(s => [s.lat, s.lng]);
      const routeResult = await getRouteWithWaypoints(
        [startPoint.lat, startPoint.lng],
        stopCoords,
        [endPoint.lat, endPoint.lng]
      );
      setRoadRoute(routeResult.route);
      
      showSuccess(`Route optimized! Reordered ${stops.length} stops for the shortest path.`);
    } catch (error) {
      console.error('Error optimizing route:', error);
      showError('Failed to optimize route. Please try again.');
    } finally {
      setIsOptimizing(false);
      setIsLoadingRoute(false);
    }
  }, [startPoint, endPoint, stops, showError, showSuccess]);

  // Set start point (only if not shift_end)
  const handleSetStartPoint = useCallback((lat: number, lng: number) => {
    if (routeType === 'shift_end') {
      showError('Start point is fixed to school location for shift end routes');
      return;
    }
    setStartPoint({ lat, lng });
    setFormData(prev => ({ ...prev, start_location: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` }));
  }, [routeType, showError]);

  // Set end point (only if not shift_start)
  const handleSetEndPoint = useCallback((lat: number, lng: number) => {
    if (routeType === 'shift_start') {
      showError('End point is fixed to school location for shift start routes');
      return;
    }
    setEndPoint({ lat, lng });
    setFormData(prev => ({ ...prev, end_location: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` }));
  }, [routeType, showError]);

  // Get all route points for bounds fitting
  const routePoints = React.useMemo(() => {
    const points: [number, number][] = [];
    if (startPoint) points.push([startPoint.lat, startPoint.lng]);
    stops.forEach(stop => points.push([stop.lat, stop.lng]));
    if (endPoint) points.push([endPoint.lat, endPoint.lng]);
    return points;
  }, [startPoint, stops, endPoint]);

  const createRouteMutation = useMutation(
    async (data: any) => {
      if (isEditMode && routeId) {
        const response = await api.patch(`/management/transport-routes/${routeId}`, data);
        return response.data;
      } else {
        const response = await api.post('/management/transport-routes', data);
        return response.data;
      }
    },
    {
      onSuccess: () => {
        setFormErrors({});
        setSubmitError(null);
        showSuccess(isEditMode ? 'Transport route updated successfully!' : 'Transport route created successfully!');
        queryClient.invalidateQueries(['transport-routes']);
        queryClient.invalidateQueries(['transport-route', routeId]);
        navigate('/transport');
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create transport route';
        const errorData = error?.response?.data;
        
        // Set general error
        setSubmitError(errorMessage);
        
        // Parse field-specific errors if available
        const fieldErrors: Record<string, string> = {};
        if (errorData?.errors) {
          // Handle validation errors from backend
          Object.keys(errorData.errors).forEach((field) => {
            const fieldError = errorData.errors[field];
            if (Array.isArray(fieldError)) {
              fieldErrors[field] = fieldError[0];
            } else {
              fieldErrors[field] = fieldError;
            }
          });
        }
        
        // Map common field names
        if (errorData?.field) {
          fieldErrors[errorData.field] = errorMessage;
        }
        
        setFormErrors(fieldErrors);
        showError(errorMessage);
        
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitError(null);
    
    // Client-side validation
    const errors: Record<string, string> = {};
    
    if (!schoolId) {
      errors.general = 'School ID is required';
      setSubmitError('School ID is required');
      showError('School ID is required');
      return;
    }

    if (!startPoint || !endPoint) {
      errors.map = 'Please set both start and end points on the map';
      setSubmitError('Please set both start and end points on the map');
      showError('Please set both start and end points on the map');
      setFormErrors(errors);
      return;
    }
    
    if (!formData.route_name.trim()) {
      errors.route_name = 'Route name is required';
    }
    
    if (!formData.route_number.trim()) {
      errors.route_number = 'Route number is required';
    }
    
    if (!formData.driver_name.trim()) {
      errors.driver_name = 'Driver name is required';
    }
    
    if (!formData.driver_phone.trim()) {
      errors.driver_phone = 'Driver phone is required';
    }
    
    if (!formData.vehicle_number.trim()) {
      errors.vehicle_number = 'Vehicle number is required';
    }
    
    if (formData.fare_per_km <= 0) {
      errors.fare_per_km = 'Fare per kilometer must be greater than 0';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError('Please fix the errors below');
      showError('Please fix the errors in the form');
      return;
    }

    // Prepare stops data - store as JSON strings with coordinates
    const stopsData = stops.map(stop => 
      JSON.stringify({ name: stop.name, lat: stop.lat, lng: stop.lng })
    );

    // Prepare route data with coordinates and bounds
    const routeData = {
      ...formData,
      route_type: routeType,
      school_id: schoolId,
      stops: stopsData,
      start_coordinates: { lat: startPoint.lat, lng: startPoint.lng },
      end_coordinates: { lat: endPoint.lat, lng: endPoint.lng },
      map_bounds: mapBounds,
      route_coordinates: roadRoute || routePoints, // Use road route if available
      fare_per_month: calculatedFare, // Use calculated fare
      max_distance_from_school: maxDistanceFromSchool, // Store max distance in meters
    };

    createRouteMutation.mutate(routeData);
  };

  if (isEditMode && isLoadingExistingRoute) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Button
            variant="ghost"
            onClick={() => navigate('/transport')}
            icon={<ArrowLeft size={18} />}
          >
            Back to Routes
          </Button>
          <h1 className={styles.title}>Edit Transport Route</h1>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
            Loading route data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          onClick={() => navigate('/transport')}
          icon={<ArrowLeft size={18} />}
        >
          Back to Routes
        </Button>
        <h1 className={styles.title}>
          {isEditMode ? 'Edit Transport Route' : 'Create Transport Route'}
        </h1>
      </div>

      <div className={styles.contentGrid}>
        <Card className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Route Information</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Route Type *</label>
                  <select
                    value={routeType}
                    onChange={(e) => {
                      const newType = e.target.value as RouteType;
                      setRouteType(newType);
                    }}
                    className={styles.select}
                    required
                  >
                    <option value="shift_start">Shift Start (To School)</option>
                    <option value="shift_end">Shift End (From School)</option>
                  </select>
                  <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {routeType === 'shift_start' 
                      ? 'Route ends at school (picking up students)' 
                      : 'Route starts from school (dropping off students)'}
                  </small>
                </div>
                <div className={styles.formGroup}>
                  <label>Route Name *</label>
                  <Input
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    required
                    placeholder="e.g., North Delhi Route"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Route Number *</label>
                  <Input
                    value={formData.route_number}
                    onChange={(e) => setFormData({ ...formData, route_number: e.target.value })}
                    required
                    placeholder="e.g., RT001"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Driver Information</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Driver Name *</label>
                  <Input
                    value={formData.driver_name}
                    onChange={(e) => {
                      setFormData({ ...formData, driver_name: e.target.value });
                      if (formErrors.driver_name) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.driver_name;
                          return newErrors;
                        });
                      }
                    }}
                    required
                    placeholder="Driver full name"
                    className={formErrors.driver_name ? styles.inputError : ''}
                  />
                  {formErrors.driver_name && (
                    <span className={styles.fieldError}>{formErrors.driver_name}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Driver Phone *</label>
                  <Input
                    value={formData.driver_phone}
                    onChange={(e) => {
                      setFormData({ ...formData, driver_phone: e.target.value });
                      if (formErrors.driver_phone) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.driver_phone;
                          return newErrors;
                        });
                      }
                    }}
                    required
                    placeholder="+91 9876543210"
                    className={formErrors.driver_phone ? styles.inputError : ''}
                  />
                  {formErrors.driver_phone && (
                    <span className={styles.fieldError}>{formErrors.driver_phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Vehicle Information</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Vehicle Number *</label>
                  <Input
                    value={formData.vehicle_number}
                    onChange={(e) => {
                      setFormData({ ...formData, vehicle_number: e.target.value });
                      if (formErrors.vehicle_number) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.vehicle_number;
                          return newErrors;
                        });
                      }
                    }}
                    required
                    placeholder="e.g., DL-01-AB-1234"
                    className={formErrors.vehicle_number ? styles.inputError : ''}
                  />
                  {formErrors.vehicle_number && (
                    <span className={styles.fieldError}>{formErrors.vehicle_number}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Vehicle Type *</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className={styles.select}
                    required
                  >
                    <option value="Bus">Bus</option>
                    <option value="Van">Van</option>
                    <option value="Mini Bus">Mini Bus</option>
                    <option value="Car">Car</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Capacity *</label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    required
                    min={1}
                    placeholder="40"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Route Details</h2>
              <div className={styles.mapInstructions}>
                <p><strong>Instructions:</strong></p>
                <ul>
                  <li>Click on the map to add stops</li>
                  <li>Right-click on a marker to set as Start or End point (if not fixed to school)</li>
                  <li>Click on a stop name to edit it</li>
                  <li>Use the trash icon to remove stops</li>
                  <li>Route will follow roads automatically</li>
                </ul>
              </div>

              <div className={styles.routePointsInfo}>
                <div className={styles.routePoint}>
                  <MapPin size={16} style={{ color: 'var(--color-success)' }} />
                  <span>
                    Start: {startPoint 
                      ? (routeType === 'shift_end' && schoolLocation && 
                         startPoint.lat === schoolLocation.lat && startPoint.lng === schoolLocation.lng
                        ? 'School (Fixed)' 
                        : `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`)
                      : 'Not set'}
                  </span>
                </div>
                <div className={styles.routePoint}>
                  <MapPin size={16} style={{ color: 'var(--color-error)' }} />
                  <span>
                    End: {endPoint 
                      ? (routeType === 'shift_start' && schoolLocation && 
                         endPoint.lat === schoolLocation.lat && endPoint.lng === schoolLocation.lng
                        ? 'School (Fixed)' 
                        : `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`)
                      : 'Not set'}
                  </span>
                </div>
                <div className={styles.routePoint}>
                  <Navigation size={16} />
                  <span>Stops: {stops.length}</span>
                </div>
                {schoolLocation && (
                  <div className={styles.routePoint}>
                    <School size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>School: {schoolLocation.lat.toFixed(4)}, {schoolLocation.lng.toFixed(4)}</span>
                  </div>
                )}
              </div>

              {stops.length > 0 && (
                <div className={styles.stopsList}>
                  <div className={styles.stopsListHeader}>
                    <h3 className={styles.stopsListTitle}>Route Stops</h3>
                    {stops.length >= 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={optimizeRoute}
                        loading={isOptimizing}
                        disabled={!startPoint || !endPoint}
                        icon={<Sparkles size={16} />}
                        title={
                          !startPoint || !endPoint
                            ? 'Please set both start and end points before optimizing'
                            : 'Reorder stops for the shortest route path'
                        }
                      >
                        Optimize Route
                      </Button>
                    )}
                  </div>
                  {stops.map((stop, index) => (
                    <div key={stop.id} className={styles.stopItem}>
                      {editingStopId === stop.id ? (
                        <div className={styles.stopEdit}>
                          <Input
                            value={newStopName}
                            onChange={(e) => setNewStopName(e.target.value)}
                            onBlur={() => updateStopName(stop.id, newStopName || stop.name)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateStopName(stop.id, newStopName || stop.name);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
                          <span 
                            className={styles.stopName}
                            onClick={() => {
                              setEditingStopId(stop.id);
                              setNewStopName(stop.name);
                            }}
                          >
                            {index + 1}. {stop.name}
                          </span>
                          <span className={styles.stopCoords}>
                            {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeStop(stop.id)}
                        className={styles.removeStopButton}
                        title="Remove stop"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Fare per Kilometer (₹) *</label>
                <Input
                  type="number"
                  value={formData.fare_per_km}
                  onChange={(e) => setFormData({ ...formData, fare_per_km: parseFloat(e.target.value) || 0 })}
                  required
                  min={0}
                  step="0.01"
                  placeholder="10.00"
                />
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Fare is calculated based on distance from school
                </small>
              </div>

              {maxDistanceFromSchool > 0 && (
                <div className={styles.fareCalculation}>
                  <h3 className={styles.fareCalculationTitle}>Fare Calculation</h3>
                  <div className={styles.fareCalculationRow}>
                    <span>Maximum Distance from School:</span>
                    <span className={styles.fareValue}>
                      {(maxDistanceFromSchool / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div className={styles.fareCalculationRow}>
                    <span>Fare per Kilometer:</span>
                    <span className={styles.fareValue}>₹{formData.fare_per_km.toFixed(2)}</span>
                  </div>
                  <div className={styles.fareCalculationRow} style={{ 
                    borderTop: '1px solid var(--color-border)', 
                    paddingTop: 'var(--spacing-sm)',
                    marginTop: 'var(--spacing-sm)',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}>
                    <span>Total Fare per Month:</span>
                    <span className={styles.fareValue} style={{ color: 'var(--color-primary)' }}>
                      ₹{calculatedFare.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <div className={styles.formActionsLeft}>
                {(!startPoint || !endPoint) && (
                  <div className={styles.disabledReason}>
                    <AlertCircle size={16} />
                    <span>
                      {(() => {
                        if (routeType === 'shift_start') {
                          // Shift start: school is end point
                          if (!endPoint) {
                            if (!schoolLocation) {
                              return (
                                <span>
                                  School location is not configured.{' '}
                                  <button
                                    type="button"
                                    onClick={() => navigate('/settings')}
                                    className={styles.settingsLink}
                                  >
                                    <Settings size={14} />
                                    Configure in Settings
                                  </button>
                                </span>
                              );
                            }
                            return 'End point (school) will be set automatically once school location is available.';
                          }
                          if (!startPoint) {
                            return 'Please set the start point on the map by clicking on the map or right-clicking a stop';
                          }
                        } else {
                          // Shift end: school is start point
                          if (!startPoint) {
                            if (!schoolLocation) {
                              return (
                                <span>
                                  School location is not configured.{' '}
                                  <button
                                    type="button"
                                    onClick={() => navigate('/settings')}
                                    className={styles.settingsLink}
                                  >
                                    <Settings size={14} />
                                    Configure in Settings
                                  </button>
                                </span>
                              );
                            }
                            return 'Start point (school) will be set automatically once school location is available.';
                          }
                          if (!endPoint) {
                            return 'Please set the end point on the map by clicking on the map or right-clicking a stop';
                          }
                        }
                        return 'Please set both start and end points on the map';
                      })()}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.formActionsRight}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/transport')}
                >
                  Cancel
                </Button>
                    <Button
                      type="submit"
                      loading={createRouteMutation.isLoading || isLoadingRoute || isLoadingExistingRoute}
                      disabled={!startPoint || !endPoint || isLoadingExistingRoute}
                      title={
                    !startPoint || !endPoint
                      ? (() => {
                          if (routeType === 'shift_start') {
                            if (!endPoint) {
                              return !schoolLocation
                                ? 'School location is not configured. Please configure school location in settings.'
                                : 'End point (school) will be set automatically.';
                            }
                            return !startPoint
                              ? 'Please set the start point on the map'
                              : undefined;
                          } else {
                            if (!startPoint) {
                              return !schoolLocation
                                ? 'School location is not configured. Please configure school location in settings.'
                                : 'Start point (school) will be set automatically.';
                            }
                            return !endPoint
                              ? 'Please set the end point on the map'
                              : undefined;
                          }
                        })()
                      : undefined
                  }
                >
                      {isEditMode ? 'Update Route' : 'Create Route'}
                    </Button>
              </div>
            </div>
          </form>
        </Card>

        <Card className={styles.mapCard}>
          <div className={styles.mapHeader}>
            <h2 className={styles.mapTitle}>Route Map</h2>
            <div className={styles.mapControls}>
              {stops.length >= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={optimizeRoute}
                  loading={isOptimizing}
                  disabled={!startPoint || !endPoint}
                  icon={<Sparkles size={16} />}
                  title={
                    !startPoint || !endPoint
                      ? 'Please set both start and end points before optimizing'
                      : 'Reorder stops for the shortest route path'
                  }
                >
                  Optimize Route
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStops([]);
                  if (routeType === 'shift_start') {
                    setStartPoint(null);
                    setFormData(prev => ({ ...prev, start_location: '' }));
                  } else {
                    setEndPoint(null);
                    setFormData(prev => ({ ...prev, end_location: '' }));
                  }
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className={styles.mapContainer}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapInvalidateSize />
              <MapBoundsCapture />
              <MapClickHandler onMapClick={handleMapClick} />
              {routePoints.length > 0 && <FitBounds points={routePoints} />}

              {/* School marker */}
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
                    <strong>School</strong>
                    <br />
                    <small>{schoolData?.name || 'School Location'}</small>
                    <br />
                    <small>{schoolLocation.lat.toFixed(6)}, {schoolLocation.lng.toFixed(6)}</small>
                  </Popup>
                </Marker>
              )}

              {/* Start point marker */}
              {startPoint && (
                <Marker
                  position={[startPoint.lat, startPoint.lng]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                  })}
                  eventHandlers={{
                    contextmenu: (e) => {
                      e.originalEvent.preventDefault();
                      if (routeType !== 'shift_end' || !schoolLocation || 
                          startPoint.lat !== schoolLocation.lat || startPoint.lng !== schoolLocation.lng) {
                        setStartPoint(null);
                        setFormData(prev => ({ ...prev, start_location: '' }));
                      }
                    },
                  }}
                >
                  <Popup>
                    <strong>Start Point</strong>
                    {routeType === 'shift_end' && schoolLocation && 
                     startPoint.lat === schoolLocation.lat && startPoint.lng === schoolLocation.lng && (
                      <><br /><small style={{ color: 'var(--color-primary)' }}>(Fixed to School)</small></>
                    )}
                    <br />
                    <small>{formData.start_location || `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}`}</small>
                  </Popup>
                </Marker>
              )}

              {/* End point marker */}
              {endPoint && (
                <Marker
                  position={[endPoint.lat, endPoint.lng]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                  })}
                  eventHandlers={{
                    contextmenu: (e) => {
                      e.originalEvent.preventDefault();
                      if (routeType !== 'shift_start' || !schoolLocation || 
                          endPoint.lat !== schoolLocation.lat || endPoint.lng !== schoolLocation.lng) {
                        setEndPoint(null);
                        setFormData(prev => ({ ...prev, end_location: '' }));
                      }
                    },
                  }}
                >
                  <Popup>
                    <strong>End Point</strong>
                    {routeType === 'shift_start' && schoolLocation && 
                     endPoint.lat === schoolLocation.lat && endPoint.lng === schoolLocation.lng && (
                      <><br /><small style={{ color: 'var(--color-primary)' }}>(Fixed to School)</small></>
                    )}
                    <br />
                    <small>{formData.end_location || `${endPoint.lat.toFixed(6)}, ${endPoint.lng.toFixed(6)}`}</small>
                  </Popup>
                </Marker>
              )}

              {/* Stop markers */}
              {stops.map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.lat, stop.lng]}
                  eventHandlers={{
                    contextmenu: (e) => {
                      e.originalEvent.preventDefault();
                      if (routeType === 'shift_end') {
                        if (!startPoint) {
                          handleSetStartPoint(stop.lat, stop.lng);
                        } else if (!endPoint) {
                          handleSetEndPoint(stop.lat, stop.lng);
                        }
                      } else {
                        if (!startPoint) {
                          handleSetStartPoint(stop.lat, stop.lng);
                        } else if (!endPoint) {
                          handleSetEndPoint(stop.lat, stop.lng);
                        }
                      }
                    },
                  }}
                >
                  <Popup>
                    <strong>{stop.name}</strong>
                    <br />
                    <small>{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</small>
                  </Popup>
                </Marker>
              ))}

              {/* Road-based route polyline */}
              {roadRoute && roadRoute.length > 1 && (
                <Polyline
                  positions={roadRoute}
                  pathOptions={{
                    color: '#6366f1',
                    weight: 5,
                    opacity: 0.8,
                  }}
                />
              )}

              {/* Fallback straight line if road route not available */}
              {!roadRoute && routePoints.length > 1 && (
                <Polyline
                  positions={routePoints}
                  pathOptions={{
                    color: '#9ca3af',
                    weight: 3,
                    opacity: 0.5,
                    dashArray: '10, 5',
                  }}
                />
              )}

              {isLoadingRoute && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 1000,
                  fontSize: '0.875rem',
                }}>
                  Calculating route...
                </div>
              )}
            </MapContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateRoute;
