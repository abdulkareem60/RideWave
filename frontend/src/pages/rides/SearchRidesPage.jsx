/**
 * SearchRidesPage — Production ride search. UI redesign — all logic unchanged.
 * Maps: Google Maps JavaScript API (Maps + Places libraries).
 * Desktop: sticky search bar + left list + right sticky map.
 * Mobile: list with List/Map toggle.
 */

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, MapPin, Flag, Clock, Car, User, Star, ShieldCheck,
  ArrowLeft, ArrowRight, Armchair, Sparkles, SearchX, AlertCircle,
  Map, List, X, Filter, LocateFixed, Navigation, Zap, Timer,
  UserCheck, CircleSlash, RefreshCw, Loader2, SlidersHorizontal, Route,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rideService }   from '../../services/rideService.js';
import { bookingService } from '../../services/bookingService.js';
import BookingModal from '../../components/booking/BookingModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getMapStyles } from '../../utils/mapStyles.js';
import { useGoogleMaps } from '../../utils/googleMapsLoader.js';

// ── Helpers (logic unchanged) ─────────────────────────────────────────────
const fmtPrice = n =>
  `PKR ${Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso), now = new Date();
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (d.toDateString() === now.toDateString()) return `Today · ${t}`;
  if (d.toDateString() === tom.toDateString()) return `Tomorrow · ${t}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${t}`;
}

const getHour = iso => iso ? new Date(iso).getHours() : 12;

function bestScore(ride, seats) {
  let s = (ride.availableSeats ?? 0) >= seats ? 40 : 0;
  s += Math.min((ride.driver?.trustScore ?? 0) / 5 * 20, 20);
  if (ride.driver?.verified) s += 15;
  s -= Math.min((ride.farePerSeat ?? 999) / 30, 15);
  const h = (new Date(ride.departureTime) - Date.now()) / 3_600_000;
  if (h >= 0 && h <= 6) s += 10;
  return s;
}

const defaultFilters = () => ({
  time: 'all', price: 'any', seats: 'any',
  verifiedOnly: false, instantOnly: false, approvalOnly: false,
});

// ── PlacesInput ───────────────────────────────────────────────────────────
function PlacesInput({ id, label, value, onChange, iconEl, placeholder, gmReady }) {
  const inputRef = useRef(null);
  const acRef    = useRef(null);
  const [query,   setQuery]   = useState(value || '');
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!query) setQuery(value || ''); }, [value]); // eslint-disable-line

  useEffect(() => {
    if (!gmReady || !inputRef.current || acRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pk' },
      fields: ['name', 'formatted_address', 'geometry'],
      types: ['geocode', 'establishment'],
    });
    ac.addListener('place_changed', () => {
      const p = ac.getPlace();
      const name = p.formatted_address || p.name || inputRef.current.value;
      setQuery(name); onChange(name);
    });
    acRef.current = ac;
  }, [gmReady, onChange]);

  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      {label && <label htmlFor={id} style={{ display:'block', fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--color-text-tertiary)', marginBottom:5 }}>{label}</label>}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-background-primary)', border:`1.5px solid ${focused ? '#185FA5' : 'var(--color-border-secondary)'}`, borderRadius:10, padding:'9px 12px', transition:'border-color .15s, box-shadow .15s', boxShadow: focused ? '0 0 0 3px rgba(24,95,165,.12)' : 'none' }}>
        <span style={{ color: focused ? '#185FA5' : 'var(--color-text-tertiary)', flexShrink:0, display:'flex', transition:'color .15s' }}>{iconEl}</span>
        <input ref={inputRef} id={id} type="text" autoComplete="off" value={query} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          style={{ border:'none', outline:'none', background:'transparent', fontSize:14, fontWeight:500, color:'var(--color-text-primary)', width:'100%', minWidth:0 }} />
        {query && <button onClick={() => { setQuery(''); onChange(''); }} aria-label="Clear" style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'var(--color-text-tertiary)', display:'flex', borderRadius:4, flexShrink:0 }}><X size={12} /></button>}
        {!gmReady && <Loader2 size={12} style={{ color:'var(--color-text-tertiary)', animation:'srp-spin .8s linear infinite', flexShrink:0 }} />}
      </div>
    </div>
  );
}

// ── RideMap (logic identical) ─────────────────────────────────────────────
function decodePolylineSRP(encoded) {
  if (!encoded) return [];
  const result = []; let index = 0, lat = 0, lng = 0;
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

function nearestSegSRP(pts, lat, lng) {
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cosLat = Math.cos((pts[i].lat + pts[i+1].lat) / 2 * Math.PI / 180);
    const ax = pts[i].lng*cosLat, ay = pts[i].lat, bx = pts[i+1].lng*cosLat, by = pts[i+1].lat;
    const px = lng*cosLat, py = lat, dx = bx-ax, dy = by-ay, lenSq = dx*dx+dy*dy;
    const t = lenSq > 1e-12 ? Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/lenSq)) : 0;
    const d = (px-ax-t*dx)**2 + (py-ay-t*dy)**2;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function RideMap({ rides, highlighted, onHighlight, userLocation, gmReady, bookingRide, bookingPickup, bookingDrop }) {
  const { isDark } = useTheme();
  const divRef = useRef(null), mapRef = useRef(null), markersRef = useRef({});

  useEffect(() => {
    if (!gmReady || !divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center: { lat: 24.8607, lng: 67.0011 }, zoom: 11,
      disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative',
      mapTypeControl: false, styles: getMapStyles(isDark),
    });
  }, [gmReady]); // eslint-disable-line

  useEffect(() => { if (mapRef.current) mapRef.current.setOptions({ styles: getMapStyles(isDark) }); }, [isDark]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    Object.values(markersRef.current).forEach(m => ['origin','dest','line','segLine','pickupMark','dropMark'].forEach(k => m[k]?.setMap(null)));
    markersRef.current = {};
    const coordRides = rides.filter(r => r.originLat && r.originLng);
    if (!coordRides.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    coordRides.forEach(ride => {
      const isHL = highlighted === ride.rideId;
      const oPos = { lat: Number(ride.originLat), lng: Number(ride.originLng) };
      const oMark = new window.google.maps.Marker({ position: oPos, map, title: `${ride.driver?.fullName ?? 'Driver'}: ${ride.originName}`, animation: isHL ? window.google.maps.Animation.BOUNCE : null, icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: isHL ? '#185FA5' : '#16a34a', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: isHL ? 11 : 9 } });
      const iw = new window.google.maps.InfoWindow({ content: `<div style="font-size:13px;max-width:200px;line-height:1.5"><strong>${ride.driver?.fullName ?? 'Driver'}</strong><br/>${ride.originName} → ${ride.destName}<br/><strong style="color:#185FA5">${fmtPrice(ride.farePerSeat)}/seat</strong> · ${ride.availableSeats ?? 0} left</div>` });
      oMark.addListener('click', () => { onHighlight(ride.rideId); iw.open(map, oMark); });
      bounds.extend(oPos);
      let dMark = null, line = null, segLine = null, pickupMark = null, dropMark = null;
      if (ride.destLat && ride.destLng) {
        const dPos = { lat: Number(ride.destLat), lng: Number(ride.destLng) };
        dMark = new window.google.maps.Marker({ position: dPos, map, icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#dc2626', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 7 } });
        bounds.extend(dPos);
        const pts = ride.routePolyline ? decodePolylineSRP(ride.routePolyline) : [];
        if (isHL) {
          if (pts.length > 1) {
            line = new window.google.maps.Polyline({ path: pts, map, strokeColor: '#185FA5', strokeOpacity: 0.85, strokeWeight: 5, zIndex: 1 });
            if (bookingRide?.rideId === ride.rideId && bookingPickup?.lat && bookingDrop?.lat) {
              const pi = nearestSegSRP(pts, bookingPickup.lat, bookingPickup.lng);
              const di = nearestSegSRP(pts, bookingDrop.lat, bookingDrop.lng);
              const sp = pts.slice(Math.min(pi,di), Math.max(pi,di)+2);
              if (sp.length > 1) segLine = new window.google.maps.Polyline({ path: sp, map, strokeColor: '#059669', strokeOpacity: 1, strokeWeight: 6, zIndex: 2 });
            }
          } else {
            line = new window.google.maps.Polyline({ path: [oPos, dPos], map, strokeColor: '#185FA5', strokeOpacity: 0.7, strokeWeight: 3, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }] });
          }
          if (bookingRide?.rideId === ride.rideId && bookingPickup?.lat)
            pickupMark = new window.google.maps.Marker({ position: { lat: bookingPickup.lat, lng: bookingPickup.lng }, map, zIndex: 20, icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#059669', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 11 }, label: { text: 'P', color: '#fff', fontSize: '10px', fontWeight: 'bold' } });
          if (bookingRide?.rideId === ride.rideId && bookingDrop?.lat)
            dropMark = new window.google.maps.Marker({ position: { lat: bookingDrop.lat, lng: bookingDrop.lng }, map, zIndex: 20, icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#d97706', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 11 }, label: { text: 'D', color: '#fff', fontSize: '10px', fontWeight: 'bold' } });
        }
      }
      markersRef.current[ride.rideId] = { origin: oMark, dest: dMark, line, segLine, pickupMark, dropMark };
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
  }, [rides, highlighted, onHighlight, bookingRide, bookingPickup, bookingDrop]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !userLocation) return;
    new window.google.maps.Marker({ position: { lat: userLocation[0], lng: userLocation[1] }, map: mapRef.current, title: 'Your location', icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#185FA5', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3, scale: 8 } });
  }, [userLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!gmReady && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--color-background-secondary)' }}><Loader2 size={28} style={{ color: '#185FA5', animation: 'srp-spin .8s linear infinite' }} /><span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading map…</span></div>}
      <div ref={divRef} style={{ width: '100%', height: '100%', opacity: gmReady ? 1 : 0, transition: 'opacity .3s' }} aria-label="Ride locations on Google Maps" role="img" />
    </div>
  );
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────
function Skeleton() {
  const sh = { background: 'var(--color-background-secondary)', borderRadius: 6, animation: 'srp-pulse 1.6s ease-in-out infinite' };
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderLeft: '3px solid var(--color-border-secondary)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }} aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div style={{ ...sh, height: 14, width: '55%' }} /><div style={{ ...sh, height: 10, width: '15%', marginLeft: 4 }} /><div style={{ ...sh, height: 14, width: '45%' }} />
        </div>
        <div style={{ ...sh, height: 30, width: 80, borderRadius: 8, alignSelf: 'flex-start' }} />
      </div>
      <div style={{ ...sh, height: 50, borderRadius: 10 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ ...sh, width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ ...sh, height: 12, width: 90 }} /><div style={{ ...sh, height: 10, width: 50 }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><div style={{ ...sh, height: 32, width: 72, borderRadius: 8 }} /><div style={{ ...sh, height: 32, width: 100, borderRadius: 8 }} /></div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────
function DAv({ src, name, size = 36 }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt={name ?? 'Driver'} onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border-tertiary)', flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#185FA510,#18A5A510)', border: '2px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={Math.round(size*.46)} style={{ color: '#185FA5' }} /></div>;
}

function VTh({ src, size = 44 }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt="Vehicle" onError={() => setBroken(true)} style={{ width: size, height: Math.round(size*.65), borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />;
  return <div style={{ width: size, height: Math.round(size*.65), borderRadius: 8, background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Car size={Math.round(size*.38)} style={{ color: 'var(--color-text-tertiary)' }} /></div>;
}

// ── Ride card — SIGNATURE: left accent rail ───────────────────────────────
const RideCard = memo(function RideCard({ ride, isBest, isHL, onHL, requesting, onRequest }) {
  const seats = ride.availableSeats ?? 0;
  const full  = seats === 0;
  const [hov, setHov] = useState(false);
  const accent = full ? '#dc2626' : isBest ? '#059669' : '#185FA5';

  return (
    <article id={`ride-${ride.rideId}`} role="listitem" onClick={() => onHL(ride.rideId)}
      aria-label={`Ride from ${ride.originName} to ${ride.destName}`}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderLeft: `3px solid ${isHL || hov ? accent : 'var(--color-border-secondary)'}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transform: hov && !isHL ? 'translateY(-1px)' : 'none', boxShadow: hov || isHL ? '0 4px 20px rgba(0,0,0,.08)' : '0 1px 3px rgba(0,0,0,.04)', outline: isHL ? `2px solid ${accent}22` : 'none', outlineOffset: 2, transition: 'transform .15s, box-shadow .15s, border-color .15s, outline .12s' }}>

      {isBest && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#059669', background: '#05966912', border: '1px solid #05966930', borderRadius: 20, padding: '3px 10px', marginBottom: 14 }}><Sparkles size={10} /> Best match</div>}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Route rail */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#16a34a', border: '2px solid #16a34a40' }} />
          <div style={{ width: 1.5, height: 28, background: 'linear-gradient(to bottom,#16a34a60,#dc262660)', margin: '2px 0' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626', border: '2px solid #dc262640' }} />
        </div>

        {/* Route names + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, marginBottom: 2 }}>{ride.originName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>↓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{ride.destName}</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}><Clock size={11} style={{ color: '#185FA5' }} />{fmtTime(ride.departureTime)}</span>
            {ride.requiresApproval && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#92400e', background: '#fef3c710', border: '1px solid #fbbf2440', borderRadius: 6, padding: '2px 7px', fontWeight: 500 }}><Timer size={10} /> Approval</span>}
            {ride.routePolyline && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#185FA5', background: '#185FA510', border: '1px solid #185FA530', borderRadius: 6, padding: '2px 7px', fontWeight: 500 }}><Route size={10} /> Route</span>}
          </div>
        </div>

        {/* Price */}
        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(ride.farePerSeat)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>per seat</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: full ? '#dc2626' : seats <= 2 ? '#d97706' : '#059669', background: full ? '#dc262608' : seats <= 2 ? '#d9770608' : '#05966908', border: `1px solid ${full ? '#dc262620' : seats <= 2 ? '#d9770620' : '#05966920'}`, borderRadius: 6, padding: '3px 7px', marginTop: 6, fontWeight: 600 }}>
            <Armchair size={10} />{full ? 'Full' : `${seats} seat${seats!==1?'s':''}`}
          </div>
        </div>
      </div>

      {/* Vehicle strip */}
      {ride.vehicle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-background-secondary)', borderRadius: 10, padding: '9px 12px', marginTop: 14 }}>
          <VTh src={ride.vehicle.imageUrl} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{ride.vehicle.make} {ride.vehicle.model}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{[ride.vehicle.color, ride.vehicle.plateNumber].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Driver + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border-tertiary)', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DAv src={ride.driver?.profilePic} name={ride.driver?.fullName} size={34} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {ride.driver?.fullName ?? 'Driver'}
              {ride.driver?.verified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#059669', fontWeight: 600 }}><ShieldCheck size={10} /> Verified</span>}
            </div>
            {ride.driver?.trustScore != null && <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}><Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} /><span style={{ fontWeight: 500 }}>{Number(ride.driver.trustScore).toFixed(1)}</span></div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link to={`/rides/${ride.rideId}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
            <button style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-primary)', transition: 'background .12s' }}>Details</button>
          </Link>
          <button onClick={e => { e.stopPropagation(); if (!full) onRequest(ride.rideId); }} disabled={full || requesting === ride.rideId}
            style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: (full || requesting === ride.rideId) ? 'not-allowed' : 'pointer', background: full ? 'var(--color-background-secondary)' : requesting === ride.rideId ? '#185FA580' : '#185FA5', color: full ? 'var(--color-text-tertiary)' : '#fff', opacity: (full || requesting === ride.rideId) ? .6 : 1, transition: 'opacity .12s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            {requesting === ride.rideId ? <><Loader2 size={12} style={{ animation: 'srp-spin .8s linear infinite' }} />Booking…</> : full ? 'Full' : 'Book seat'}
          </button>
        </div>
      </div>
    </article>
  );
});

// ── Filter components ─────────────────────────────────────────────────────
function Chip({ selected, onClick, children }) {
  return <button onClick={onClick} aria-pressed={selected} style={{ fontSize: 12, fontWeight: selected ? 600 : 400, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${selected ? '#185FA5' : 'var(--color-border-secondary)'}`, background: selected ? '#185FA5' : 'var(--color-background-primary)', color: selected ? '#fff' : 'var(--color-text-primary)', cursor: 'pointer', transition: 'all .12s' }}>{children}</button>;
}
function Toggle({ label, checked, onChange, icon }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', width: '100%', padding: '6px 0' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--color-text-primary)' }}>{icon && <span style={{ color: checked ? '#185FA5' : 'var(--color-text-tertiary)', display: 'flex', transition: 'color .15s' }}>{icon}</span>}{label}</span>
      <div role="switch" aria-checked={checked} tabIndex={0} onClick={() => onChange(!checked)} onKeyDown={e => (e.key==='Enter'||e.key===' ')&&onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? '#185FA5' : 'var(--color-background-secondary)', border: '1.5px solid var(--color-border-secondary)', position: 'relative', transition: 'background .2s', flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 19 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .18s cubic-bezier(.34,1.56,.64,1)' }} />
      </div>
    </label>
  );
}
function FG({ label, children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div></div>;
}
function FilterDrawer({ filters, onChange, onClose }) {
  const [l, setL] = useState({ ...filters });
  const s = (k, v) => setL(f => ({ ...f, [k]: v }));
  return (
    <div role="dialog" aria-modal="true" aria-label="Ride filters" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.25rem', borderBottom: '1px solid var(--color-border-tertiary)' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Filters</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setL(defaultFilters())} style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}>Reset all</button>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-text-secondary)', padding: 4 }}><X size={18} /></button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <FG label="Departure time">{[['all','Any time'],['morning','Morning (6–12)'],['afternoon','Afternoon (12–17)'],['evening','Evening (17–21)'],['night','Night (21–6)']].map(([v,lb]) => <Chip key={v} selected={l.time===v} onClick={() => s('time',v)}>{lb}</Chip>)}</FG>
        <FG label="Price per seat">{[['any','Any price'],['under150','Under PKR 150'],['under300','Under PKR 300'],['under500','Under PKR 500']].map(([v,lb]) => <Chip key={v} selected={l.price===v} onClick={() => s('price',v)}>{lb}</Chip>)}</FG>
        <FG label="Minimum seats">{[['any','Any'],['1','1+'],['2','2+'],['3','3+'],['4','4+']].map(([v,lb]) => <Chip key={v} selected={l.seats===v} onClick={() => s('seats',v)}>{lb}</Chip>)}</FG>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Driver & Booking</div>
          <Toggle label="Verified drivers only"  checked={l.verifiedOnly}  onChange={v => s('verifiedOnly',v)}  icon={<UserCheck size={14} />} />
          <Toggle label="Instant booking only"   checked={l.instantOnly}   onChange={v => s('instantOnly',v)}   icon={<Zap size={14} />} />
          <Toggle label="Requires approval only" checked={l.approvalOnly}  onChange={v => s('approvalOnly',v)}  icon={<Timer size={14} />} />
        </div>
      </div>
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border-tertiary)' }}>
        <button onClick={() => { onChange(l); onClose(); }} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: '#185FA5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Apply filters</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page (all state + logic identical to previous version)
// ═══════════════════════════════════════════════════════════════════════════
const SORT_OPTIONS = [
  { value: 'best',     label: 'Best match' },
  { value: 'cheapest', label: 'Cheapest first' },
  { value: 'earliest', label: 'Earliest departure' },
  { value: 'rated',    label: 'Highest rated' },
  { value: 'seats',    label: 'Most seats' },
];
const PAGE_SIZE = 10;

export default function SearchRidesPage() {
  const gmReady = useGoogleMaps();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [from,        setFrom]        = useState(() => searchParams.get('from') ?? '');
  const [to,          setTo]          = useState(() => searchParams.get('to')   ?? '');
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0]);
  const [seats,       setSeats]       = useState(1);
  const [searchKey,   setSearchKey]   = useState(null);
  const [page,        setPage]        = useState(0);
  const [sort,        setSort]        = useState('best');
  const [filters,     setFilters]     = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView,  setMobileView]  = useState('list');
  const [highlighted, setHighlighted] = useState(null);
  const [requesting,  setRequesting]  = useState(null);
  const [bookingRide,   setBookingRide]   = useState(null);
  const [bookingPickup, setBookingPickup] = useState(null);
  const [bookingDrop,   setBookingDrop]   = useState(null);
  const [userLoc,     setUserLoc]     = useState(null);
  const listRef = useRef(null);

  // All available rides — fetched on mount, shown before user searches
  const { data: browseRides = [], isFetching: browseFetching } = useQuery({
    queryKey: ['rides', 'browse'],
    queryFn:  () => rideService.browse({ page: 0, size: 200 }).then(r => {
      const d = r.data?.data;
      if (Array.isArray(d)) return d;
      if (d?.content)       return d.content;
      return [];
    }),
    staleTime: 60_000,
  });

  // Search results — only activated after user explicitly searches
  const { data: searchResults = [], isFetching: searchFetching, isError, refetch } = useQuery({
    queryKey: ['rides', 'search', searchKey],
    queryFn:  () => rideService.search({
      from: searchKey.from, to: searchKey.to, date: searchKey.date,
      seats: 1, page: 0, size: 200,
    }).then(r => {
      const d = r.data?.data;
      if (Array.isArray(d)) return d;
      if (d?.content)       return d.content;
      return [];
    }),
    enabled:   !!searchKey,
    staleTime: 30_000,
  });

  // Active dataset: search results when searching, all rides when browsing
  const rawRides = (searchKey ? searchResults : browseRides)
    .filter(r => r.status !== 'EXPIRED');   // never show EXPIRED to passengers
  const isFetching = searchKey ? searchFetching : browseFetching;

  const filtered = useMemo(() => {
    let rides = rawRides.filter(r => (r.availableSeats ?? 0) >= seats);
    const f = filters;
    if (f.time === 'morning')   rides = rides.filter(r => getHour(r.departureTime) >= 6  && getHour(r.departureTime) < 12);
    if (f.time === 'afternoon') rides = rides.filter(r => getHour(r.departureTime) >= 12 && getHour(r.departureTime) < 17);
    if (f.time === 'evening')   rides = rides.filter(r => getHour(r.departureTime) >= 17 && getHour(r.departureTime) < 21);
    if (f.time === 'night')     rides = rides.filter(r => getHour(r.departureTime) >= 21 || getHour(r.departureTime) < 6);
    if (f.price === 'under150') rides = rides.filter(r => r.farePerSeat < 150);
    if (f.price === 'under300') rides = rides.filter(r => r.farePerSeat < 300);
    if (f.price === 'under500') rides = rides.filter(r => r.farePerSeat < 500);
    if (f.seats !== 'any')      rides = rides.filter(r => (r.availableSeats ?? 0) >= Number(f.seats));
    if (f.verifiedOnly)         rides = rides.filter(r => r.driver?.verified);
    if (f.instantOnly)          rides = rides.filter(r => !r.requiresApproval);
    if (f.approvalOnly)         rides = rides.filter(r =>  r.requiresApproval);
    if (sort === 'cheapest')      rides.sort((a,b) => a.farePerSeat - b.farePerSeat);
    else if (sort === 'earliest') rides.sort((a,b) => new Date(a.departureTime) - new Date(b.departureTime));
    else if (sort === 'rated')    rides.sort((a,b) => (b.driver?.trustScore??0) - (a.driver?.trustScore??0));
    else if (sort === 'seats')    rides.sort((a,b) => (b.availableSeats??0) - (a.availableSeats??0));
    else                          rides.sort((a,b) => bestScore(b,seats) - bestScore(a,seats));
    return rides;
  }, [rawRides, filters, sort, seats]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const afc = [filters.time!=='all', filters.price!=='any', filters.seats!=='any', filters.verifiedOnly, filters.instantOnly, filters.approvalOnly].filter(Boolean).length;

  const doSearch = useCallback(() => { setPage(0); setHighlighted(null); setSearchKey({ from, to, date }); }, [from, to, date]);

  useEffect(() => {
    if (searchParams.get('from') && searchParams.get('to')) doSearch();
  }, []); // eslint-disable-line

  const doRequest = useCallback((rideId) => {
    if (!user) { toast.error('Please login first to book a ride.'); navigate('/login', { state: { from: location } }); return; }
    const ride = paginated.find(r => r.rideId === rideId) ?? [...(rawRides ?? [])].find(r => r.rideId === rideId);
    if (ride) setBookingRide(ride);
  }, [user, navigate, location, paginated, rawRides]);

  const doHL = useCallback(rideId => {
    setHighlighted(h => h === rideId ? null : rideId);
    document.getElementById(`ride-${rideId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const doLoc = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(p => setUserLoc([p.coords.latitude, p.coords.longitude]), () => toast.error('Location access denied.'));
  }, []);

  const labelDate = () => {
    const today=new Date(); today.setHours(0,0,0,0);
    const tom=new Date(today); tom.setDate(today.getDate()+1);
    const sel=new Date(date+'T12:00:00'); sel.setHours(0,0,0,0);
    if(sel.getTime()===today.getTime()) return 'Today';
    if(sel.getTime()===tom.getTime())   return 'Tomorrow';
    return new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  const hasSearched = !!searchKey;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <style>{`
        @keyframes srp-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes srp-spin   { to{transform:rotate(360deg)} }
        @keyframes srp-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .srp-card-enter { animation: srp-fadein .2s ease both; }
        .srp-map-col  { display: none !important; }
        .srp-mob-tog  { display: flex !important; }
        @media(min-width:900px){ .srp-map-col { display: flex !important; } .srp-mob-tog { display: none !important; } }
        .srp-sort select { appearance:none; -webkit-appearance:none; }
      `}</style>

      {/* Sticky header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'var(--color-background-primary)', borderBottom:'1px solid var(--color-border-tertiary)', backdropFilter:'blur(8px)' }}>
        <div style={{ maxWidth:1320, margin:'0 auto', padding:'14px 20px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Search size={16} style={{ color:'#fff' }} /></div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--color-text-primary)', lineHeight:1.2 }}>Find a ride</div>
                <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>Google Maps autocomplete · Pakistan</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', fontWeight:500 }}>{filtered.length > 0 ? (hasSearched ? `${filtered.length} result${filtered.length!==1?'s':''}` : `${filtered.length} ride${filtered.length!==1?'s':''} available`) : ''}</div>
          </div>

          {/* Search card */}
          <div style={{ background:'var(--color-background-secondary)', border:'1.5px solid var(--color-border-secondary)', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, flex:1, minWidth:280 }}>
                <PlacesInput id="srch-from" label="From" value={from} onChange={setFrom} placeholder="Origin city or area" gmReady={gmReady} iconEl={<MapPin size={15} style={{ color:'#16a34a' }} />} />
                <div style={{ flexShrink:0, paddingBottom:9, color:'var(--color-text-tertiary)' }}><ArrowRight size={16} /></div>
                <PlacesInput id="srch-to" label="To" value={to} onChange={setTo} placeholder="Destination" gmReady={gmReady} iconEl={<Flag size={15} style={{ color:'#dc2626' }} />} />
              </div>
              {/* Date */}
              <div style={{ flexShrink:0 }}>
                <label htmlFor="srch-date" style={{ display:'block', fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--color-text-tertiary)', marginBottom:5 }}>Date</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-background-primary)', border:'1.5px solid var(--color-border-secondary)', borderRadius:10, padding:'9px 12px', cursor:'pointer', minWidth:130, position:'relative' }} onClick={() => document.getElementById('srch-date').showPicker?.()}>
                  <Clock size={14} style={{ color:'#185FA5', flexShrink:0 }} />
                  <span style={{ fontSize:14, fontWeight:500, color:'var(--color-text-primary)' }}>{labelDate()}</span>
                  <input id="srch-date" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0 }} />
                </div>
              </div>
              {/* Seats */}
              <div style={{ flexShrink:0 }}>
                <label htmlFor="srch-seats" style={{ display:'block', fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--color-text-tertiary)', marginBottom:5 }}>Seats</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-background-primary)', border:'1.5px solid var(--color-border-secondary)', borderRadius:10, padding:'9px 12px' }}>
                  <Armchair size={14} style={{ color:'#185FA5', flexShrink:0 }} />
                  <select id="srch-seats" value={seats} onChange={e => setSeats(Number(e.target.value))} style={{ border:'none', outline:'none', background:'transparent', fontSize:14, fontWeight:500, color:'var(--color-text-primary)', cursor:'pointer', minWidth:70 }}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} seat{n>1?'s':''}</option>)}
                  </select>
                </div>
              </div>
              {/* Search btn */}
              <button onClick={doSearch} disabled={isFetching} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:10, border:'none', background: isFetching ? '#185FA580' : '#185FA5', color:'#fff', fontSize:14, fontWeight:600, cursor: isFetching ? 'not-allowed' : 'pointer', flexShrink:0, alignSelf:'flex-end', boxShadow:'0 2px 8px rgba(24,95,165,.3)', transition:'opacity .12s' }}>
                {isFetching && searchKey ? <><RefreshCw size={14} style={{ animation:'srp-spin .8s linear infinite' }} />Searching…</> : <><Search size={14} />Search</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1320, margin:'0 auto', padding:'20px 20px 60px', display:'flex', gap:24, alignItems:'flex-start' }}>

        {/* List */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Toolbar */}
          {hasSearched && !isFetching && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:13, color:'var(--color-text-secondary)' }}>
                {filtered.length > 0 ? <><strong style={{ color:'var(--color-text-primary)', fontWeight:600 }}>{filtered.length}</strong> {hasSearched ? `result${filtered.length!==1?'s':''}` : `ride${filtered.length!==1?'s':''} available`}</> : 'No rides found'}
                {afc > 0 && <span style={{ marginLeft:6, color:'#185FA5', fontWeight:500 }}>· {afc} filter{afc>1?'s':''} active</span>}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                {/* Mobile toggle */}
                <div className="srp-mob-tog" style={{ gap:2, background:'var(--color-background-secondary)', border:'1px solid var(--color-border-secondary)', borderRadius:10, padding:3 }}>
                  {[['list','List',<List size={13} key="l"/>],['map','Map',<Map size={13} key="m"/>]].map(([v,lb,ic]) => (
                    <button key={v} onClick={() => setMobileView(v)} aria-pressed={mobileView===v} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight: mobileView===v ? 600 : 400, padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', background: mobileView===v ? 'var(--color-background-primary)' : 'transparent', color:'var(--color-text-primary)', boxShadow: mobileView===v ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition:'all .12s' }}>{ic}{lb}</button>
                  ))}
                </div>
                {/* Filters */}
                <button onClick={() => setShowFilters(true)} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:9, border:`1.5px solid ${afc>0?'#185FA5':'var(--color-border-secondary)'}`, background: afc>0 ? '#185FA508' : 'var(--color-background-primary)', color: afc>0 ? '#185FA5' : 'var(--color-text-primary)', cursor:'pointer', transition:'all .12s' }}>
                  <SlidersHorizontal size={13} />Filters
                  {afc > 0 && <span style={{ width:18, height:18, borderRadius:'50%', background:'#185FA5', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{afc}</span>}
                </button>
                {/* Sort */}
                <select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }} aria-label="Sort rides"
                  style={{ fontSize:13, fontWeight:500, background:'var(--color-background-primary)', color:'var(--color-text-primary)', border:'1.5px solid var(--color-border-secondary)', borderRadius:9, padding:'7px 10px', cursor:'pointer', outline:'none' }}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {/* Location */}
                <button onClick={doLoc} title="Use my location" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:500, padding:'7px 12px', borderRadius:9, border:'1.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', cursor:'pointer' }}>
                  <LocateFixed size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Mobile map */}
          {hasSearched && mobileView==='map' && (
            <div className="srp-mob-tog" style={{ marginBottom:16, borderRadius:14, overflow:'hidden', height:380, border:'1px solid var(--color-border-tertiary)', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <RideMap rides={filtered} highlighted={highlighted} onHighlight={doHL} userLocation={userLoc} gmReady={gmReady} bookingRide={bookingRide} bookingPickup={bookingPickup} bookingDrop={bookingDrop} />
            </div>
          )}

          {/* Skeletons */}
          {isFetching && <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{Array.from({length:5}).map((_,i)=><Skeleton key={i}/>)}</div>}

          {/* Error */}
          {!isFetching && isError && (
            <div style={{ textAlign:'center', padding:'4rem 1rem', borderRadius:16, background:'var(--color-background-primary)', border:'1px solid var(--color-border-tertiary)' }} role="alert">
              <div style={{ width:56, height:56, borderRadius:'50%', background:'#dc262610', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}><AlertCircle size={24} style={{ color:'#dc2626' }}/></div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--color-text-primary)', marginBottom:6 }}>Search failed</div>
              <div style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:20 }}>Something went wrong. Please try again.</div>
              <button onClick={() => refetch()} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:9, border:'none', background:'#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}><RefreshCw size={13} />Try again</button>
            </div>
          )}

          {/* Results */}
          {!isFetching && !isError && (hasSearched || rawRides.length > 0) && (
            <>
              {paginated.length > 0 ? (
                <div ref={listRef} style={{ display:'flex', flexDirection:'column', gap:10 }} role="list">
                  {paginated.map((ride,i) => (
                    <div key={ride.rideId} className="srp-card-enter" style={{ animationDelay:`${i*35}ms` }}>
                      <RideCard ride={ride} isBest={page===0&&i===0&&sort==='best'} isHL={highlighted===ride.rideId} onHL={doHL} requesting={requesting} onRequest={doRequest} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'5rem 1.5rem', borderRadius:16, background:'var(--color-background-primary)', border:'1px solid var(--color-border-tertiary)' }} role="status">
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}><SearchX size={28} style={{ color:'var(--color-text-tertiary)' }}/></div>
                  <div style={{ fontSize:17, fontWeight:700, color:'var(--color-text-primary)', marginBottom:8 }}>No rides found</div>
                  <div style={{ fontSize:13, color:'var(--color-text-secondary)', maxWidth:300, margin:'0 auto 24px', lineHeight:1.6 }}>Try adjusting filters, nearby locations, or a different date.</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    {afc > 0 && <button onClick={() => { setFilters(defaultFilters()); setPage(0); }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'1.5px solid var(--color-border-secondary)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, fontWeight:500, cursor:'pointer' }}><CircleSlash size={13} />Clear filters</button>}
                    <button onClick={() => { const d=new Date(); d.setDate(d.getDate()+1); setDate(d.toISOString().split('T')[0]); }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'1.5px solid var(--color-border-secondary)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, fontWeight:500, cursor:'pointer' }}><Clock size={13} />Try tomorrow</button>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:24 }} role="navigation">
                  <button disabled={page===0} onClick={() => { setPage(p=>p-1); listRef.current?.scrollIntoView({behavior:'smooth'}); }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'1.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', fontSize:13, fontWeight:500, cursor:page===0?'not-allowed':'pointer', opacity:page===0?.4:1 }}><ArrowLeft size={13} />Previous</button>
                  <span style={{ fontSize:13, color:'var(--color-text-secondary)', fontWeight:500 }} aria-live="polite">{page+1} / {totalPages}</span>
                  <button disabled={page>=totalPages-1} onClick={() => { setPage(p=>p+1); listRef.current?.scrollIntoView({behavior:'smooth'}); }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'1.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', fontSize:13, fontWeight:500, cursor:page>=totalPages-1?'not-allowed':'pointer', opacity:page>=totalPages-1?.4:1 }}>Next <ArrowRight size={13} /></button>
                </div>
              )}
            </>
          )}

          {/* Pre-search */}
          {!hasSearched && !isFetching && rawRides.length === 0 && (
            <div style={{ textAlign:'center', padding:'6rem 1.5rem' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#185FA520,#185FA508)', border:'1.5px solid #185FA520', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}><Navigation size={32} style={{ color:'#185FA5' }}/></div>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--color-text-primary)', marginBottom:10 }}>No rides available right now</div>
              <div style={{ fontSize:14, color:'var(--color-text-secondary)', maxWidth:340, margin:'0 auto', lineHeight:1.65 }}>Check back soon — new rides are added daily by verified drivers across Pakistan.</div>
            </div>
          )}
        </div>

        {/* Map column — desktop */}
        <div className="srp-map-col" style={{ width:'40%', maxWidth:500, flexShrink:0, position:'sticky', top:148, height:'calc(100vh - 170px)', borderRadius:16, overflow:'hidden', border:'1px solid var(--color-border-tertiary)', boxShadow:'0 4px 20px rgba(0,0,0,.07)' }}>
          {filtered.length > 0 && !isFetching
            ? <RideMap rides={filtered} highlighted={highlighted} onHighlight={doHL} userLocation={userLoc} gmReady={gmReady} bookingRide={bookingRide} bookingPickup={bookingPickup} bookingDrop={bookingDrop} />
            : <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, background:'var(--color-background-secondary)' }}>
                <div style={{ width:52, height:52, borderRadius:14, background:'var(--color-background-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}><Map size={24} style={{ color:'var(--color-text-tertiary)' }}/></div>
                <span style={{ fontSize:13, color:'var(--color-text-secondary)', fontWeight:500 }}>{isFetching ? 'Loading map…' : 'Map appears after search'}</span>
              </div>
          }
        </div>
      </div>

      {/* Filter drawer */}
      {showFilters && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex' }}>
          <div style={{ flex:1, background:'rgba(0,0,0,.45)', backdropFilter:'blur(2px)' }} onClick={() => setShowFilters(false)} aria-hidden="true" />
          <div style={{ width:Math.min(380,window.innerWidth-32), background:'var(--color-background-primary)', display:'flex', flexDirection:'column', height:'100%', borderLeft:'1px solid var(--color-border-tertiary)', boxShadow:'-8px 0 32px rgba(0,0,0,.12)' }}>
            <FilterDrawer filters={filters} onChange={f => { setFilters(f); setPage(0); }} onClose={() => setShowFilters(false)} />
          </div>
        </div>
      )}

      {/* Booking modal */}
      {bookingRide && (
        <BookingModal
          ride={bookingRide}
          onPickupChange={setBookingPickup}
          onDropChange={setBookingDrop}
          onClose={() => { setBookingRide(null); setBookingPickup(null); setBookingDrop(null); }}
        />
      )}
    </div>
  );
}