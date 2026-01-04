/**
 * Utility functions for road-based routing using OSRM
 */

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  code: string;
  routes: Array<{
    geometry: {
      coordinates: [number, number][]; // [lng, lat] format
    };
    distance: number; // in meters
    duration: number; // in seconds
  }>;
}

export interface RouteWithDistance {
  route: [number, number][] | null;
  distance: number; // in meters
}

/**
 * Calculate distance between two points using Haversine formula (straight line)
 * @param point1 [lat, lng]
 * @param point2 [lat, lng]
 * @returns distance in meters
 */
export function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1[0] * Math.PI / 180;
  const φ2 = point2[0] * Math.PI / 180;
  const Δφ = (point2[0] - point1[0]) * Math.PI / 180;
  const Δλ = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Get road-based route between multiple waypoints using OSRM
 * @param waypoints Array of [lat, lng] coordinates
 * @returns Promise with route geometry coordinates and distance
 */
export async function getRoute(
  waypoints: [number, number][]
): Promise<RouteWithDistance> {
  if (waypoints.length < 2) {
    return { route: null, distance: 0 };
  }

  try {
    // OSRM uses [lng, lat] format and requires coordinates as string
    const coordinates = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    
    // Use configurable OSRM endpoint (fallback to public demo server)
    // Set VITE_OSRM_URL in .env (e.g., http://localhost:5000 or https://your-osrm-instance.com)
    const osrmUrl = import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org';
    const url = `${osrmUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data: RouteResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM route not found, falling back to straight line');
      // Fallback: use waypoints directly as [lat, lng] for Leaflet
      const route = waypoints.map(([lat, lng]) => [lat, lng] as [number, number]);
      // Calculate straight line distance
      let totalDistance = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
      }
      return { route, distance: totalDistance };
    }

    // Convert from [lng, lat] to [lat, lng] for Leaflet
    const route = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    const distance = data.routes[0].distance; // Distance in meters
    return { route, distance };
  } catch (error) {
    console.warn('Error fetching route from OSRM, falling back to straight line:', error);
    // Fallback to straight line - keep [lat, lng] format for Leaflet
    const route = waypoints.map(([lat, lng]) => [lat, lng] as [number, number]);
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
    }
    return { route, distance: totalDistance };
  }
}

/**
 * Get route with multiple waypoints (for routes with stops)
 * This calculates road-based routes between each consecutive pair of points
 * and combines them for a complete route that follows roads
 */
export async function getRouteWithWaypoints(
  start: [number, number],
  stops: [number, number][],
  end: [number, number]
): Promise<RouteWithDistance> {
  const allWaypoints = [start, ...stops, end];
  
  // If only 2 points, use simple route
  if (allWaypoints.length === 2) {
    return getRoute(allWaypoints);
  }

  // For multiple waypoints, calculate route between each consecutive pair
  // This ensures each segment follows roads properly
  try {
    const routeSegments: [number, number][] = [];
    let totalDistance = 0;

    for (let i = 0; i < allWaypoints.length - 1; i++) {
      const segmentResult = await getRoute([allWaypoints[i], allWaypoints[i + 1]]);
      
      if (segmentResult.route && segmentResult.route.length > 0) {
        // Add all points from this segment except the last one (to avoid duplicates)
        // The last point will be added by the next segment
        if (i === 0) {
          // First segment: add all points
          routeSegments.push(...segmentResult.route);
        } else {
          // Subsequent segments: skip first point (it's the same as last point of previous segment)
          routeSegments.push(...segmentResult.route.slice(1));
        }
        totalDistance += segmentResult.distance;
      } else {
        // Fallback: add straight line between points (already in [lat, lng] format)
        if (i === 0) {
          routeSegments.push(allWaypoints[i], allWaypoints[i + 1]);
        } else {
          routeSegments.push(allWaypoints[i + 1]);
        }
        totalDistance += calculateDistance(allWaypoints[i], allWaypoints[i + 1]);
      }
    }

    return { route: routeSegments, distance: totalDistance };
  } catch (error) {
    console.error('Error calculating route segments:', error);
    // Fallback to simple route through all waypoints
    return getRoute(allWaypoints);
  }
}

/**
 * Get distance from school to a point
 */
export async function getDistanceFromSchool(
  school: [number, number],
  point: [number, number]
): Promise<number> {
  try {
    const result = await getRoute([school, point]);
    return result.distance;
  } catch (error) {
    // Fallback to straight line distance
    return calculateDistance(school, point);
  }
}

