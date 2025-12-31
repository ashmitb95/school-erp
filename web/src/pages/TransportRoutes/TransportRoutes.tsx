import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search, Plus, Eye, MapPin, Users, Bus, TrendingUp, Navigation, Loader } from 'lucide-react';
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
    React.useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, points]);
    return null;
}

const TransportRoutes: React.FC = () => {
    const { user } = useAuthStore();
    const schoolId = user?.school_id;
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

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

    const { data: routeDetail } = useQuery(
        ['transport-route', selectedRoute],
        async () => {
            if (!selectedRoute) return null;
            const response = await api.get(`/management/transport-routes/${selectedRoute}`);
            return response.data;
        },
        { enabled: !!selectedRoute }
    );

    const { data: routeSummary } = useQuery(
        'transportRouteSummary',
        async () => {
            const [totalRoutes] = await Promise.all([
                api.get('/management/transport-routes?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
            ]);

            return {
                totalRoutes: totalRoutes.data.pagination?.total || 0,
            };
        }
    );

    // Get coordinates from stored geodata or fallback to city-based calculation
    const getStudentCoordinates = useCallback((student: any): [number, number] | null => {
        // Use stored latitude/longitude if available (handle both string and number)
        const lat = student.latitude;
        const lng = student.longitude;

        if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            return [parseFloat(lat), parseFloat(lng)];
        }

        // Fallback: calculate from city (for students without geodata)
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

    // Get route coordinates for map using stored student geodata
    const routeCoordinates = useMemo(() => {
        if (!routeDetail) return null;

        // Get coordinates from students assigned to this route
        const studentsWithCoords = (routeDetail.students || [])
            .map((student: any) => {
                const coords = getStudentCoordinates(student);
                return coords ? { student, coords } : null;
            })
            .filter(Boolean) as Array<{ student: any; coords: [number, number] }>;

        // If no students with coordinates, create a fallback route from start/end locations
        if (studentsWithCoords.length === 0) {
            // Fallback: use city center with a simple route
            const city = routeDetail.start_location?.split(',')[1]?.trim() || 'Delhi';
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
            const baseCoords = locationMap[city] || [28.6139, 77.2090];
            const start: [number, number] = [baseCoords[0] - 0.05, baseCoords[1] - 0.05];
            const end: [number, number] = [baseCoords[0] + 0.05, baseCoords[1] + 0.05];
            const stops: [number, number][] = [
                [baseCoords[0] - 0.02, baseCoords[1] - 0.02],
                [baseCoords[0], baseCoords[1]],
                [baseCoords[0] + 0.02, baseCoords[1] + 0.02],
            ];
            return {
                start,
                end,
                stops,
                allPoints: [start, ...stops, end],
            };
        }

        // Sort students by their position along the route (using stored coordinates)
        // This creates a natural route path from student pickup points
        const sortedStudents = [...studentsWithCoords].sort((a, b) => {
            // Sort by latitude first (north to south), then longitude (west to east)
            // This creates a logical route progression
            if (Math.abs(a.coords[0] - b.coords[0]) > 0.01) {
                return a.coords[0] - b.coords[0]; // Sort by lat
            }
            return a.coords[1] - b.coords[1]; // Then by lng
        });

        // Use first and last student as route start/end
        const start: [number, number] = sortedStudents[0].coords;
        const end: [number, number] = sortedStudents[sortedStudents.length - 1].coords;

        // Create stops by clustering nearby students (within ~300m)
        const stops: [number, number][] = [];
        const usedStudents = new Set<number>();
        const clusterRadius = 0.003; // ~300m

        for (let i = 0; i < sortedStudents.length; i++) {
            if (usedStudents.has(i)) continue;

            const current = sortedStudents[i];
            const nearbyStudents: number[] = [i];

            // Find nearby students to cluster
            for (let j = i + 1; j < sortedStudents.length; j++) {
                if (usedStudents.has(j)) continue;
                const other = sortedStudents[j];
                const distance = Math.sqrt(
                    Math.pow(current.coords[0] - other.coords[0], 2) +
                    Math.pow(current.coords[1] - other.coords[1], 2)
                );
                if (distance < clusterRadius) {
                    nearbyStudents.push(j);
                }
            }

            // Calculate centroid of nearby students for stop location
            const avgLat = nearbyStudents.reduce((sum, idx) => sum + sortedStudents[idx].coords[0], 0) / nearbyStudents.length;
            const avgLng = nearbyStudents.reduce((sum, idx) => sum + sortedStudents[idx].coords[1], 0) / nearbyStudents.length;

            stops.push([avgLat, avgLng]);
            nearbyStudents.forEach(idx => usedStudents.add(idx));
        }

        // Build route path: start -> stops -> end
        const allPoints: [number, number][] = [start, ...stops, end];

        return {
            start,
            end,
            stops,
            allPoints,
        };
    }, [routeDetail, getStudentCoordinates]);

    // Get student pickup points using stored geodata
    const studentPickupPoints = useMemo(() => {
        if (!routeDetail?.students) return [];

        return routeDetail.students.map((student: any) => {
            const address = `${student.address}, ${student.city}, ${student.state} ${student.pincode}`;
            const coords = getStudentCoordinates(student);
            return {
                student,
                coords,
                address,
            };
        }).filter((item: any) => item.coords);
    }, [routeDetail, getStudentCoordinates]);

    const columnDefs: ColDef[] = useMemo(() => [
        {
            headerName: 'Route Name',
            field: 'route_name',
            width: 200,
            pinned: 'left',
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {params.value}
                </div>
            ),
        },
        {
            headerName: 'Route Number',
            field: 'route_number',
            width: 120,
        },
        {
            headerName: 'Driver',
            field: 'driver_name',
            width: 180,
            cellRenderer: (params: ICellRendererParams) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{params.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {params.data.driver_phone}
                    </div>
                </div>
            ),
        },
        {
            headerName: 'Vehicle',
            field: 'vehicle_number',
            width: 150,
            cellRenderer: (params: ICellRendererParams) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{params.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {params.data.vehicle_type}
                    </div>
                </div>
            ),
        },
        {
            headerName: 'Route',
            field: 'start_location',
            width: 250,
            cellRenderer: (params: ICellRendererParams) => (
                <div>
                    <div style={{ fontSize: '0.875rem' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {params.data.start_location}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        → {params.data.end_location}
                    </div>
                </div>
            ),
        },
        {
            headerName: 'Students',
            field: 'student_count',
            width: 100,
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ fontWeight: 600, color: 'var(--color-info)' }}>
                    {params.value || 0} / {params.data.capacity}
                </div>
            ),
        },
        {
            headerName: 'Fare',
            field: 'fare_per_month',
            width: 120,
            cellRenderer: (params: ICellRendererParams) => (
                <span style={{ fontWeight: 600 }}>
                    ₹{parseFloat(params.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            headerName: 'Actions',
            field: 'actions',
            width: 60,
            pinned: 'right',
            cellRenderer: (params: ICellRendererParams) => (
                <button
                    onClick={() => setSelectedRoute(params.data.id)}
                    style={{
                        padding: '0.375rem',
                        border: '1px solid var(--color-border)',
                        background: 'transparent',
                        color: 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--color-primary)10';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="View Map"
                >
                    <Eye size={16} strokeWidth={1.5} />
                </button>
            ),
        },
    ], []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
    }), []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Transport Routes</h1>
                    <p className={styles.subtitle}>Manage bus routes and student pickup points</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button variant="secondary" style={{ display: 'none' }}>Export CSV</Button>
                    <Button icon={<Plus size={18} />}>Add Route</Button>
                </div>
            </div>

            <div className={styles.analyticsGrid}>
                <Card className={styles.analyticsCard}>
                    <div className={styles.analyticsIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
                        <Bus size={24} />
                    </div>
                    <div className={styles.analyticsContent}>
                        <div className={styles.analyticsValue}>
                            {routeSummary?.totalRoutes.toLocaleString() || '0'}
                        </div>
                        <div className={styles.analyticsTitle}>Total Routes</div>
                    </div>
                    <TrendingUp size={16} className={styles.analyticsTrend} />
                </Card>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBar}>
                    <Input
                        placeholder="Search routes by name, number, or driver..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        icon={<Search size={18} />}
                        fullWidth
                    />
                </div>
            </div>

            {!selectedRoute ? (
                <Card className={styles.tableCard}>
                    <h2 className={styles.sectionTitle}>All Routes</h2>
                    <TableWrapper>
                        {isLoading ? (
                            <TableSkeleton rows={10} columns={7} />
                        ) : (
                            <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
                                <AgGridReact
                                    rowData={data?.data || []}
                                    columnDefs={columnDefs}
                                    defaultColDef={defaultColDef}
                                    pagination={false}
                                    loading={false}
                                    animateRows={true}
                                    enableCellTextSelection={true}
                                    suppressCellFocus={true}
                                    getRowId={(params) => params.data.id}
                                    noRowsOverlayComponent={() => (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                            No routes found
                                        </div>
                                    )}
                                />
                            </div>
                        )}
                    </TableWrapper>
                </Card>
            ) : routeDetail && routeCoordinates ? (
                <Card className={styles.mapCard}>
                    <div className={styles.mapHeader}>
                        <h2 className={styles.mapTitle}>{routeDetail.route_name}</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoute(null)}
                        >
                            Close
                        </Button>
                    </div>
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
                            <span>{routeDetail.stops?.length || 0} stops</span>
                        </div>
                    </div>
                    <div className={styles.mapContainer}>
                        {routeCoordinates && routeCoordinates.allPoints.length > 0 ? (
                            <MapContainer
                                center={routeCoordinates.start as [number, number]}
                                zoom={12}
                                style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
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
                                {routeCoordinates.stops.map((stop, index) => (
                                    <Marker key={index} position={stop}>
                                        <Popup>
                                            <strong>Stop {index + 1}: {routeDetail.stops[index]}</strong>
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
                        ) : (
                            <div style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: '1rem',
                                color: 'var(--color-text-secondary)'
                            }}>
                                <MapPin size={48} />
                                <p>No geodata available for this route</p>
                                <p style={{ fontSize: '0.875rem' }}>Students need to be assigned and geotagged</p>
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <Card className={styles.mapCard}>
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)'
                    }}>
                        <Loader size={48} className={styles.loadingSpinner} />
                        <p style={{ marginTop: '1rem' }}>Loading route details...</p>
                    </div>
                </Card>
            )}

            {data?.pagination && (
                <div className={styles.pagination}>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                    >
                        Previous
                    </Button>
                    <span>
                        Page {page} of {data.pagination.totalPages} ({data.pagination.total.toLocaleString()} total)
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= data.pagination.totalPages || isLoading}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TransportRoutes;

