import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search, Plus, Eye, MapPin, Users, Bus, Navigation, X, Loader, Edit } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import TableWrapper from '../../components/TableWrapper/TableWrapper';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import styles from './TransportRoutes.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// Component to invalidate map size
function MapInvalidateSize() {
    const map = useMap();
    useEffect(() => {
        const timers = [
            setTimeout(() => map.invalidateSize(), 100),
            setTimeout(() => map.invalidateSize(), 300),
            setTimeout(() => map.invalidateSize(), 500),
            setTimeout(() => map.invalidateSize(), 1000),
        ];
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);
        return () => {
            timers.forEach(timer => clearTimeout(timer));
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);
    return null;
}

const TransportRoutes: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const schoolId = user?.school_id;
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    const { data, isLoading } = useQuery(
        ['transport-routes', schoolId, page, search],
        async () => {
            if (!schoolId) return { data: [], pagination: { total: 0 } };
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                school_id: schoolId,
            });
            if (search) params.append('search', search);
            const response = await api.get(`/management/transport-routes?${params}`);
            return response.data;
        },
        { enabled: !!schoolId }
    );

    const { data: routeDetail, isLoading: isLoadingRoute } = useQuery(
        ['transport-route', selectedRouteId],
        async () => {
            if (!selectedRouteId) return null;
            const response = await api.get(`/management/transport-routes/${selectedRouteId}`);
            return response.data;
        },
        { enabled: !!selectedRouteId }
    );

    // Helper function to parse coordinates from location string
    const parseLocationString = useCallback((locationStr: string): [number, number] | null => {
        if (!locationStr) return null;

        // Try to parse "Lat: X, Lng: Y" format
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
    }, []);

    // Get route coordinates for map - handles both new format (with coordinates) and old format (with strings)
    const routeCoordinates = useMemo(() => {
        if (!routeDetail) {
            console.log('TransportRoutes: No routeDetail');
            return null;
        }

        console.log('TransportRoutes: routeDetail', routeDetail);

        // Parse stops from saved data (always available as JSON strings)
        const stops: [number, number][] = [];
        if (routeDetail.stops && Array.isArray(routeDetail.stops)) {
            routeDetail.stops.forEach((stopStr: string) => {
                try {
                    const stopData = typeof stopStr === 'string' ? JSON.parse(stopStr) : stopStr;
                    if (stopData.lat != null && stopData.lng != null && !isNaN(stopData.lat) && !isNaN(stopData.lng)) {
                        stops.push([parseFloat(stopData.lat), parseFloat(stopData.lng)]);
                    }
                } catch (e) {
                    console.warn('Failed to parse stop:', stopStr, e);
                }
            });
        }

        console.log('TransportRoutes: Parsed stops', stops);

        // Try to get start coordinates - first from start_coordinates field, then from start_location string
        let start: [number, number] | null = null;
        if (routeDetail.start_coordinates && routeDetail.start_coordinates.lat && routeDetail.start_coordinates.lng) {
            start = [routeDetail.start_coordinates.lat, routeDetail.start_coordinates.lng];
        } else if (routeDetail.start_location) {
            start = parseLocationString(routeDetail.start_location);
        }

        // Try to get end coordinates - first from end_coordinates field, then from school location, then from end_location string
        let end: [number, number] | null = null;
        if (routeDetail.end_coordinates && routeDetail.end_coordinates.lat && routeDetail.end_coordinates.lng) {
            end = [routeDetail.end_coordinates.lat, routeDetail.end_coordinates.lng];
        } else if (routeDetail.school?.settings?.location) {
            // If end_location is school name, use school location from settings
            end = [
                routeDetail.school.settings.location.lat,
                routeDetail.school.settings.location.lng,
            ];
        } else if (routeDetail.end_location) {
            end = parseLocationString(routeDetail.end_location);
        }

        console.log('TransportRoutes: start', start, 'end', end, 'stops count', stops.length);

        // If we have stops, we can always render something
        if (stops.length > 0) {
            // If we have both start and end, use them
            if (start && end) {
                // Use saved route_coordinates if available (road-following path)
                let allPoints: [number, number][];
                if (routeDetail.route_coordinates && Array.isArray(routeDetail.route_coordinates) && routeDetail.route_coordinates.length > 0) {
                    allPoints = routeDetail.route_coordinates;
                } else {
                    // Construct from points: start -> stops -> end
                    allPoints = [start, ...stops, end];
                }

                const result = {
                    start,
                    end,
                    stops,
                    allPoints,
                };
                console.log('TransportRoutes: Returning coordinates with start/end', result);
                return result;
            }

            // If we have stops but no start/end, use first and last stop
            if (stops.length >= 2) {
                const startFromStops = stops[0];
                const endFromStops = stops[stops.length - 1];
                const middleStops = stops.slice(1, -1);

                let allPoints: [number, number][];
                if (routeDetail.route_coordinates && Array.isArray(routeDetail.route_coordinates) && routeDetail.route_coordinates.length > 0) {
                    allPoints = routeDetail.route_coordinates;
                } else {
                    allPoints = [startFromStops, ...middleStops, endFromStops];
                }

                const result = {
                    start: startFromStops,
                    end: endFromStops,
                    stops: middleStops,
                    allPoints,
                };
                console.log('TransportRoutes: Returning coordinates from stops', result);
                return result;
            }

            // If we have at least one stop, use it as both start and end
            const singlePoint = stops[0];
            const result = {
                start: singlePoint,
                end: singlePoint,
                stops: [],
                allPoints: [singlePoint],
            };
            console.log('TransportRoutes: Returning single point', result);
            return result;
        }

        // Last resort: use default coordinates
        const defaultStart: [number, number] = [28.6139, 77.2090];
        const defaultEnd: [number, number] = [28.6149, 77.2100];
        const defaultResult = {
            start: defaultStart,
            end: defaultEnd,
            stops: [],
            allPoints: [defaultStart, defaultEnd],
        };
        console.log('TransportRoutes: Returning default coordinates', defaultResult);
        return defaultResult;
    }, [routeDetail, parseLocationString]);

    // Get student pickup points
    const getStudentCoordinates = useCallback((student: any): [number, number] | null => {
        const lat = student.latitude;
        const lng = student.longitude;

        if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            return [parseFloat(lat), parseFloat(lng)];
        }

        // Fallback: calculate from city
        const city = student.city || 'Delhi';
        const locationMap: Record<string, [number, number]> = {
            'Delhi': [28.6139, 77.2090],
            'Mumbai': [19.0760, 72.8777],
            'Bangalore': [12.9716, 77.5946],
            'Chennai': [13.0827, 80.2707],
            'Kolkata': [22.5726, 88.3639],
            'Hyderabad': [17.3850, 78.4867],
            'Pune': [18.5204, 73.8567],
            'Ahmedabad': [23.0225, 72.5714],
        };

        const coords = locationMap[city] || [28.6139, 77.2090];
        return [coords[0] + (Math.random() - 0.5) * 0.05, coords[1] + (Math.random() - 0.5) * 0.05];
    }, []);

    // Get student pickup points
    const studentPickupPoints = useMemo(() => {
        if (!routeDetail?.students) return [];

        return routeDetail.students.map((student: any) => {
            const address = `${student.address || ''}, ${student.city || ''}, ${student.state || ''} ${student.pincode || ''}`;
            const coords = getStudentCoordinates(student);
            return {
                student,
                coords,
                address,
            };
        }).filter((item: any) => item.coords);
    }, [routeDetail, getStudentCoordinates]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
    }), []);

    const columnDefs: ColDef[] = useMemo(() => [
        {
            headerName: 'Route Number',
            field: 'route_number',
            width: 150,
            pinned: 'left',
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {params.value}
                </div>
            ),
        },
        {
            headerName: 'Route Name',
            field: 'route_name',
            width: 200,
        },
        {
            headerName: 'Driver',
            field: 'driver_name',
            width: 150,
        },
        {
            headerName: 'Vehicle',
            field: 'vehicle_number',
            width: 150,
            cellRenderer: (params: ICellRendererParams) => (
                <div>
                    <div>{params.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {params.data.vehicle_type}
                    </div>
                </div>
            ),
        },
        {
            headerName: 'Capacity',
            field: 'capacity',
            width: 100,
        },
        {
            headerName: 'Students',
            field: 'student_count',
            width: 100,
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Users size={14} />
                    {params.value || 0}
                </div>
            ),
        },
        {
            headerName: 'Status',
            field: 'is_active',
            width: 100,
            cellRenderer: (params: ICellRendererParams) => (
                <span
                    style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: params.value ? 'var(--color-success)' : 'var(--color-error)',
                        color: 'white',
                    }}
                >
                    {params.value ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            headerName: 'Actions',
            field: 'actions',
            width: 180,
            pinned: 'right',
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRouteId(params.data.id);
                        }}
                        style={{
                            padding: '0.25rem 0.5rem',
                            border: 'none',
                            background: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                        }}
                    >
                        <Eye size={14} />
                        View
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/transport-routes/edit/${params.data.id}`);
                        }}
                        style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                        }}
                    >
                        <Edit size={14} />
                        Edit
                    </button>
                </div>
            ),
        },
    ], [navigate]);

    const routes = data?.data || [];
    const pagination = data?.pagination || { total: 0, page: 1, limit: 50, totalPages: 0 };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Transport Routes</h1>
                    <p className={styles.subtitle}>Manage school transport routes and assignments</p>
                </div>
                <div>
                    <Button
                        onClick={() => navigate('/transport-routes/create')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} />
                        Create Route
                    </Button>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBar}>
                    <Input
                        type="text"
                        placeholder="Search routes, drivers, vehicles..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        icon={<Search size={18} />}
                    />
                </div>
            </div>

            <div className={styles.contentGrid}>
                <Card className={styles.tableCard}>
                    <h2 className={styles.sectionTitle}>All Routes</h2>
                    <TableWrapper>
                        {isLoading ? (
                            <TableSkeleton rows={10} columns={8} />
                        ) : (
                            <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
                                <AgGridReact
                                    rowData={routes}
                                    columnDefs={columnDefs}
                                    defaultColDef={defaultColDef}
                                    pagination={false}
                                    rowSelection="single"
                                    animateRows={true}
                                    enableCellTextSelection={true}
                                    suppressCellFocus={true}
                                    getRowId={(params) => params.data.id}
                                    onRowClicked={(event) => setSelectedRouteId(event.data.id)}
                                    noRowsOverlayComponent={() => (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                            No routes found
                                        </div>
                                    )}
                                />
                            </div>
                        )}
                    </TableWrapper>
                    {pagination.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total.toLocaleString()} total)
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={page >= pagination.totalPages || isLoading}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </Card>

                {selectedRouteId && (
                    <Card className={styles.mapCard}>
                        <div className={styles.mapHeader}>
                            <h2 className={styles.mapTitle}>
                                {isLoadingRoute ? 'Loading...' : routeDetail?.route_name || 'Route Details'}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRouteId(null)}
                            >
                                <X size={18} />
                            </Button>
                        </div>
                        {isLoadingRoute ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <Loader size={32} className={styles.loadingSpinner} />
                                <p style={{ marginTop: '1rem' }}>Loading route details...</p>
                            </div>
                        ) : !routeDetail ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <MapPin size={48} />
                                <p>No route selected</p>
                            </div>
                        ) : routeCoordinates ? (
                            <>
                                <div className={styles.mapInfo}>
                                    <div className={styles.mapInfoItem}>
                                        <Bus size={16} />
                                        <span>{routeDetail.vehicle_number} ({routeDetail.vehicle_type})</span>
                                    </div>
                                    <div className={styles.mapInfoItem}>
                                        <Users size={16} />
                                        <span>{routeDetail.student_count || 0} students</span>
                                    </div>
                                    <div className={styles.mapInfoItem}>
                                        <Navigation size={16} />
                                        <span>{routeCoordinates.stops.length} stops</span>
                                    </div>
                                </div>
                                <div className={styles.mapContainer}>
                                    <MapContainer
                                        key={`route-map-${selectedRouteId}`}
                                        center={routeCoordinates.start}
                                        zoom={12}
                                        style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)' }}
                                        scrollWheelZoom={true}
                                        whenReady={() => {
                                            // Map is ready
                                        }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <MapInvalidateSize />
                                        <FitBounds points={routeCoordinates.allPoints} />

                                        {/* Start marker */}
                                        <Marker position={routeCoordinates.start}>
                                            <Popup>
                                                <strong>Start: {routeDetail.start_location}</strong>
                                            </Popup>
                                        </Marker>

                                        {/* End marker */}
                                        <Marker position={routeCoordinates.end}>
                                            <Popup>
                                                <strong>End: {routeDetail.end_location}</strong>
                                            </Popup>
                                        </Marker>

                                        {/* Stop markers */}
                                        {routeCoordinates.stops.map((stop, index) => {
                                            let stopName = `Stop ${index + 1}`;
                                            if (routeDetail.stops && routeDetail.stops[index]) {
                                                try {
                                                    const stopData = typeof routeDetail.stops[index] === 'string'
                                                        ? JSON.parse(routeDetail.stops[index])
                                                        : routeDetail.stops[index];
                                                    stopName = stopData.name || stopName;
                                                } catch {
                                                    stopName = routeDetail.stops[index] || stopName;
                                                }
                                            }
                                            return (
                                                <Marker key={index} position={stop}>
                                                    <Popup>
                                                        <strong>{stopName}</strong>
                                                        <br />
                                                        <small>{stop[0].toFixed(6)}, {stop[1].toFixed(6)}</small>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}

                                        {/* Route polyline */}
                                        {routeCoordinates.allPoints.length > 1 && (
                                            <Polyline
                                                positions={routeCoordinates.allPoints}
                                                pathOptions={{
                                                    color: '#6366f1',
                                                    weight: 4,
                                                    opacity: 0.7,
                                                }}
                                            />
                                        )}

                                        {/* Student pickup points */}
                                        {studentPickupPoints.map((point: any, index: number) => (
                                            <Marker
                                                key={index}
                                                position={point.coords as [number, number]}
                                                icon={L.icon({
                                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                                                    iconSize: [25, 41],
                                                    iconAnchor: [12, 41],
                                                    popupAnchor: [1, -34],
                                                })}
                                            >
                                                <Popup>
                                                    <div>
                                                        <strong>{point.student.first_name} {point.student.last_name}</strong>
                                                        <br />
                                                        <small>{point.student.admission_number}</small>
                                                        <br />
                                                        <small>{point.address}</small>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <MapPin size={48} />
                                <p>Unable to render map for this route</p>
                                <p style={{ fontSize: '0.875rem' }}>
                                    {routeDetail?.stops?.length ?
                                        `Found ${routeDetail.stops.length} stops but couldn't parse coordinates` :
                                        'No stops or geodata available for this route'}
                                </p>
                                {routeDetail && (
                                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        <p>Debug: routeDetail exists: {routeDetail ? 'yes' : 'no'}</p>
                                        <p>routeCoordinates: {routeCoordinates ? 'exists' : 'null'}</p>
                                        <p>Stops count: {routeDetail.stops?.length || 0}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default TransportRoutes;

