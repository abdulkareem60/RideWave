/**
 * RouteMap — renders a driver's actual route on Google Maps.
 *
 * Uses the stored encoded polyline (from Google Directions API, fetched at
 * ride-creation time and stored in rides.route_polyline) to draw the real
 * road path rather than a straight line between origin and destination.
 *
 * Features:
 *   - Decodes Google encoded polyline client-side (no API call at display time)
 *   - Draws the full driver route in brand blue
 *   - Origin marker (green) and destination marker (red)
 *   - Optional pickup (emerald) and drop (amber) segment highlight
 *   - Optional array of passenger {pickupLat, pickupLng, dropLat, dropLng} for
 *     driver dashboard view (renders all booked passengers' stops)
 *   - Distance and duration derived from the decoded polyline path
 *   - Dark mode aware via useTheme
 *   - Falls back to a straight connector if no polyline is stored
 *
 * Props:
 *   originLat/Lng    {number}   Driver's start coordinates
 *   destLat/Lng      {number}   Driver's end coordinates
 *   originName       {string}   Label for origin marker tooltip
 *   destName         {string}   Label for destination marker tooltip
 *   routePolyline    {string?}  Google encoded polyline
 *   pickupLat/Lng    {number?}  Passenger pickup — draws segment highlight
 *   pickupName       {string?}
 *   dropLat/Lng      {number?}  Passenger drop — draws segment highlight
 *   dropName         {string?}
 *   passengers       {Array?}   [{pickupLat, pickupLng, pickupName,
 *                                  dropLat, dropLng, dropName, passengerName}]
 *                               Used in driver dashboard to show all stops
 *   height           {string}   CSS height (default '360px')
 *   onDistanceDuration {fn?}    Called with { distanceKm, durationMin } once computed
 *   className        {string?}
 */

import { useEffect, useRef, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getMapStyles } from '../../utils/mapStyles.js';
import { useGoogleMaps } from '../../utils/googleMapsLoader.js';

// ── Polyline decoder (Google encoded polyline algorithm) ──────────────────
function decodePolyline(encoded) {
  if (!encoded) return [];
  const result = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, value = 0;
    do { b = encoded.charCodeAt(index++) - 63; value |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (value & 1) ? ~(value >> 1) : (value >> 1);
    shift = 0; value = 0;
    do { b = encoded.charCodeAt(index++) - 63; value |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (value & 1) ? ~(value >> 1) : (value >> 1);
    result.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return result;
}

// ── Haversine distance between two lat/lng points (km) ───────────────────
function haversineKm(a, b) {
  const R  = 6371;
  const dL = (b.lat - a.lat) * Math.PI / 180;
  const dG = (b.lng - a.lng) * Math.PI / 180;
  const s  = Math.sin(dL / 2) ** 2
           + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
           * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Total path length from a decoded polyline array
function pathLengthKm(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversineKm(pts[i - 1], pts[i]);
  return total;
}

// Nearest segment index on the polyline to a given lat/lng
function nearestSegmentIdx(pts, lat, lng) {
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cosLat = Math.cos((pts[i].lat + pts[i + 1].lat) / 2 * Math.PI / 180);
    const ax = pts[i].lng * cosLat, ay = pts[i].lat;
    const bx = pts[i + 1].lng * cosLat, by = pts[i + 1].lat;
    const px = lng * cosLat, py = lat;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;
    const cx = ax + t * dx, cy = ay + t * dy;
    const dist = (px - cx) ** 2 + (py - cy) ** 2;
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx;
}

// ── Marker factory helpers ────────────────────────────────────────────────
function makeCircleIcon(color, scale = 9, strokeColor = '#ffffff', strokeWeight = 2) {
  return {
    path:         window.google.maps.SymbolPath.CIRCLE,
    fillColor:    color,
    fillOpacity:  1,
    strokeColor,
    strokeWeight,
    scale,
  };
}

const RouteMap = memo(function RouteMap({
  originLat, originLng, originName = 'Origin',
  destLat,   destLng,   destName   = 'Destination',
  routePolyline,
  pickupLat, pickupLng, pickupName,
  dropLat,   dropLng,   dropName,
  passengers,           // [{pickupLat,pickupLng,pickupName,dropLat,dropLng,dropName,passengerName}]
  height     = '360px',
  onDistanceDuration,
  className  = '',
}) {
  const gmReady  = useGoogleMaps();
  const { isDark } = useTheme();
  const divRef   = useRef(null);
  const mapRef   = useRef(null);
  const objsRef  = useRef([]);  // all Map objects to clean up on re-render

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gmReady || !divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center:           { lat: 24.8607, lng: 67.0011 },
      zoom:             12,
      disableDefaultUI: true,
      zoomControl:      true,
      gestureHandling:  'cooperative',
      styles:           getMapStyles(isDark),
    });
  }, [gmReady]);   // eslint-disable-line

  // ── Live dark-mode switch ─────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) mapRef.current.setOptions({ styles: getMapStyles(isDark) });
  }, [isDark]);

  // ── Draw route, markers, segment ─────────────────────────────────────────
  useEffect(() => {
    if (!gmReady || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;

    // Remove all previous overlays
    objsRef.current.forEach(o => { try { o.setMap(null); } catch (_) {} });
    objsRef.current = [];

    const origin = originLat && originLng
      ? { lat: Number(originLat), lng: Number(originLng) } : null;
    const dest   = destLat   && destLng
      ? { lat: Number(destLat),   lng: Number(destLng)   } : null;

    if (!origin) return;

    const bounds = new window.google.maps.LatLngBounds();

    // ── 1. Decode stored polyline ──────────────────────────────────────────
    const decodedPts = routePolyline ? decodePolyline(routePolyline) : [];

    // ── 2. Draw full route ─────────────────────────────────────────────────
    if (decodedPts.length > 1) {
      const routeLine = new window.google.maps.Polyline({
        path:          decodedPts,
        map,
        strokeColor:   '#185FA5',
        strokeOpacity: 0.85,
        strokeWeight:  5,
        zIndex:        1,
      });
      objsRef.current.push(routeLine);
      decodedPts.forEach(p => bounds.extend(p));

      // ── 2a. Passenger pickup→drop segment highlight ─────────────────────
      if (pickupLat && pickupLng && dropLat && dropLng) {
        const pIdx = nearestSegmentIdx(decodedPts, Number(pickupLat), Number(pickupLng));
        const dIdx = nearestSegmentIdx(decodedPts, Number(dropLat),   Number(dropLng));
        const segPts = decodedPts.slice(Math.min(pIdx, dIdx), Math.max(pIdx, dIdx) + 2);
        if (segPts.length > 1) {
          const segLine = new window.google.maps.Polyline({
            path:          segPts,
            map,
            strokeColor:   '#059669',   // emerald
            strokeOpacity: 1,
            strokeWeight:  6,
            zIndex:        2,
          });
          objsRef.current.push(segLine);
        }
      }

      // ── 2b. Compute distance / duration from decoded polyline ─────────────
      if (onDistanceDuration) {
        const distanceKm  = pathLengthKm(decodedPts);
        // Rough duration: assume average 40 km/h in urban Pakistan
        const durationMin = Math.round(distanceKm / 40 * 60);
        onDistanceDuration({ distanceKm: distanceKm.toFixed(1), durationMin });
      }

    } else if (origin && dest) {
      // Fallback — straight connector when no polyline
      const fallback = new window.google.maps.Polyline({
        path:          [origin, dest],
        map,
        strokeColor:   '#185FA5',
        strokeOpacity: 0.5,
        strokeWeight:  3,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
      });
      objsRef.current.push(fallback);
      bounds.extend(origin);
      if (dest) bounds.extend(dest);

      if (onDistanceDuration && dest) {
        const distanceKm  = haversineKm(origin, dest);
        const durationMin = Math.round(distanceKm / 40 * 60);
        onDistanceDuration({ distanceKm: distanceKm.toFixed(1), durationMin });
      }
    }

    // ── 3. Origin marker (green) ──────────────────────────────────────────
    if (origin) {
      const oMarker = new window.google.maps.Marker({
        position: origin, map,
        title:    originName,
        zIndex:   10,
        icon:     makeCircleIcon('#16a34a', 11),
      });
      const oInfo = new window.google.maps.InfoWindow({
        content: `<div style="font-size:12px;font-weight:600;padding:2px 4px">${originName}</div>`,
      });
      oMarker.addListener('click', () => oInfo.open(map, oMarker));
      objsRef.current.push(oMarker, oInfo);
      bounds.extend(origin);
    }

    // ── 4. Destination marker (red) ───────────────────────────────────────
    if (dest) {
      const dMarker = new window.google.maps.Marker({
        position: dest, map,
        title:    destName,
        zIndex:   10,
        icon:     makeCircleIcon('#dc2626', 11),
      });
      const dInfo = new window.google.maps.InfoWindow({
        content: `<div style="font-size:12px;font-weight:600;padding:2px 4px">${destName}</div>`,
      });
      dMarker.addListener('click', () => dInfo.open(map, dMarker));
      objsRef.current.push(dMarker, dInfo);
      bounds.extend(dest);
    }

    // ── 5. Passenger pickup marker (emerald pin) ──────────────────────────
    if (pickupLat && pickupLng) {
      const pPos    = { lat: Number(pickupLat), lng: Number(pickupLng) };
      const pMarker = new window.google.maps.Marker({
        position: pPos, map,
        title:    pickupName ?? 'Your Pickup',
        zIndex:   20,
        icon:     makeCircleIcon('#059669', 13, '#ffffff', 3),
        label:    { text: 'P', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' },
      });
      const pInfo = new window.google.maps.InfoWindow({
        content: `<div style="font-size:12px;padding:2px 4px"><strong>Your pickup</strong><br/>${pickupName ?? ''}</div>`,
      });
      pMarker.addListener('click', () => pInfo.open(map, pMarker));
      objsRef.current.push(pMarker, pInfo);
      bounds.extend(pPos);
    }

    // ── 6. Passenger drop marker (amber pin) ──────────────────────────────
    if (dropLat && dropLng) {
      const dPos    = { lat: Number(dropLat), lng: Number(dropLng) };
      const dMarker = new window.google.maps.Marker({
        position: dPos, map,
        title:    dropName ?? 'Your Drop',
        zIndex:   20,
        icon:     makeCircleIcon('#d97706', 13, '#ffffff', 3),
        label:    { text: 'D', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' },
      });
      const dInfo = new window.google.maps.InfoWindow({
        content: `<div style="font-size:12px;padding:2px 4px"><strong>Your drop</strong><br/>${dropName ?? ''}</div>`,
      });
      dMarker.addListener('click', () => dInfo.open(map, dMarker));
      objsRef.current.push(dMarker, dInfo);
      bounds.extend(dPos);
    }

    // ── 7. All booked passengers' markers (driver dashboard) ─────────────
    if (passengers?.length) {
      passengers.forEach((p, i) => {
        if (p.pickupLat && p.pickupLng) {
          const pPos = { lat: Number(p.pickupLat), lng: Number(p.pickupLng) };
          const pm   = new window.google.maps.Marker({
            position: pPos, map, zIndex: 15,
            title:    `${p.passengerName ?? `Passenger ${i + 1}`} pickup`,
            icon:     makeCircleIcon('#059669', 10, '#ffffff', 2),
            label:    { text: String(i + 1), color: '#ffffff', fontSize: '9px', fontWeight: 'bold' },
          });
          const pi = new window.google.maps.InfoWindow({
            content: `<div style="font-size:12px;padding:2px 4px"><strong>${p.passengerName ?? `Passenger ${i + 1}`}</strong><br/>Pickup: ${p.pickupName ?? 'on route'}</div>`,
          });
          pm.addListener('click', () => pi.open(map, pm));
          objsRef.current.push(pm, pi);
          bounds.extend(pPos);
        }
        if (p.dropLat && p.dropLng) {
          const dPos = { lat: Number(p.dropLat), lng: Number(p.dropLng) };
          const dm   = new window.google.maps.Marker({
            position: dPos, map, zIndex: 15,
            title:    `${p.passengerName ?? `Passenger ${i + 1}`} drop`,
            icon:     makeCircleIcon('#d97706', 10, '#ffffff', 2),
            label:    { text: String(i + 1), color: '#ffffff', fontSize: '9px', fontWeight: 'bold' },
          });
          const di = new window.google.maps.InfoWindow({
            content: `<div style="font-size:12px;padding:2px 4px"><strong>${p.passengerName ?? `Passenger ${i + 1}`}</strong><br/>Drop: ${p.dropName ?? 'on route'}</div>`,
          });
          dm.addListener('click', () => di.open(map, dm));
          objsRef.current.push(dm, di);
          bounds.extend(dPos);
        }
      });
    }

    // ── 8. Fit map to all markers ─────────────────────────────────────────
    if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

  }, [
    gmReady, originLat, originLng, destLat, destLng, routePolyline,
    pickupLat, pickupLng, dropLat, dropLng, passengers, onDistanceDuration,
    originName, destName, pickupName, dropName,
  ]); // eslint-disable-line

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}
         style={{ height, minHeight: 240 }}>
      {!gmReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-surface-dark">
          <Loader2 className="h-7 w-7 text-gray-300 dark:text-gray-600 animate-spin" />
          <span className="text-xs text-gray-400 dark:text-gray-500">Loading map…</span>
        </div>
      )}
      <div
        ref={divRef}
        style={{ width: '100%', height: '100%', opacity: gmReady ? 1 : 0, transition: 'opacity .3s' }}
        aria-label="Route map"
        role="img"
      />
      {/* Legend */}
      {gmReady && (
        <div className="absolute bottom-2 left-2 flex flex-col gap-1"
             style={{ background: 'rgba(0,0,0,.55)', borderRadius: 8, padding: '6px 10px' }}>
          <LegendItem color="#16a34a" label="Origin" />
          <LegendItem color="#dc2626" label="Destination" />
          {(pickupLat || passengers?.some(p => p.pickupLat)) && (
            <LegendItem color="#059669" label="Pickup (P)" />
          )}
          {(dropLat || passengers?.some(p => p.dropLat)) && (
            <LegendItem color="#d97706" label="Drop (D)" />
          )}
        </div>
      )}
    </div>
  );
});

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1.5px solid #fff', flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: '#fff', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

export default RouteMap;