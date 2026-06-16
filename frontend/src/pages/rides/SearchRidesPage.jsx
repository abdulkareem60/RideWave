/**
 * SearchRidesPage — Premium RideWave ride search experience.
 * UI/UX redesign only — backend, API calls, filtering logic unchanged.
 */

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, MapPin, Flag, Clock, Car, User, Star, ShieldCheck,
  ArrowLeft, ArrowRight, Armchair, Sparkles, SearchX, AlertCircle,
  Map, List, X, Filter, LocateFixed, Navigation, Zap, Timer,
  UserCheck, CircleSlash, RefreshCw, Loader2, ChevronDown,
  Calendar, Users, Route, BadgeCheck, Gauge, IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rideService }   from '../../services/rideService.js';
import { bookingService } from '../../services/bookingService.js';

// ── Google Maps singleton loader (UNCHANGED) ──────────────────────────────
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let _gmapsPromise = null;

function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set in .env'));
      return;
    }
    const cbName = '__gmapsReady_' + Date.now();
    window[cbName] = () => { delete window[cbName]; resolve(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=${cbName}`;
    s.async = true;
    s.onerror = () => { delete window[cbName]; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(s);
  });
  return _gmapsPromise;
}

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places);
  useEffect(() => {
    if (ready) return;
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch(err => console.error('[GoogleMaps]', err.message));
  }, []);
  return ready;
}

// ── Helpers (UNCHANGED) ───────────────────────────────────────────────────
const fmtPrice = n =>
  `Rs. ${Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

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

// ── Places Autocomplete input (UI IMPROVED) ──────────────────────────────
function PlacesInput({ id, label, value, onChange, icon: Icon, placeholder, gmReady }) {
  const inputRef = useRef(null);
  const acRef    = useRef(null);
  const [query, setQuery] = useState(value || '');
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!query) setQuery(value || ''); }, [value]);

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
      setQuery(name);
      onChange(name);
    });
    acRef.current = ac;
  }, [gmReady, onChange]);

  return (
    <div className="flex-1 min-w-[140px]">
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className={`
        relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all duration-200
        ${focused
          ? 'ring-2 ring-indigo-500/20 border-indigo-500 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}>
        {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onChange(''); }}
            aria-label="Clear"
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}
        {!gmReady && <Loader2 className="h-4 w-4 text-gray-400 animate-spin flex-shrink-0" />}
      </div>
    </div>
  );
}

// ── Google Map panel (UI IMPROVED) ───────────────────────────────────────
function RideMap({ rides, highlighted, onHighlight, userLocation, gmReady }) {
  const divRef     = useRef(null);
  const mapRef     = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!gmReady || !divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center: { lat: 24.8607, lng: 67.0011 },
      zoom: 11,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
    });
  }, [gmReady]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;

    Object.values(markersRef.current).forEach(m => {
      if (m.origin) m.origin.setMap(null);
      if (m.dest)   m.dest.setMap(null);
      if (m.line)   m.line.setMap(null);
    });
    markersRef.current = {};

    const coordRides = rides.filter(r => r.originLat && r.originLng);
    if (!coordRides.length) return;

    const bounds = new window.google.maps.LatLngBounds();

    coordRides.forEach(ride => {
      const isHL  = highlighted === ride.rideId;
      const oPos  = { lat: Number(ride.originLat), lng: Number(ride.originLng) };

      const oMark = new window.google.maps.Marker({
        position:  oPos,
        map,
        title:     `${ride.driver?.fullName ?? 'Driver'}: ${ride.originName} → ${ride.destName}`,
        animation: isHL ? window.google.maps.Animation.BOUNCE : null,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor:    isHL ? '#4F46E5' : '#10B981',
          fillOpacity:  1,
          strokeColor:  '#ffffff',
          strokeWeight: 2,
          scale:        isHL ? 11 : 9,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-size:13px;max-width:200px"><strong>${ride.driver?.fullName ?? 'Driver'}</strong><br/>${ride.originName} → ${ride.destName}<br/><strong style="color:#4F46E5">${fmtPrice(ride.farePerSeat)}/seat</strong> · ${ride.availableSeats ?? 0} left</div>`,
      });

      oMark.addListener('click', () => { onHighlight(ride.rideId); infoWindow.open(map, oMark); });
      bounds.extend(oPos);

      let dMark = null, line = null;
      if (ride.destLat && ride.destLng) {
        const dPos = { lat: Number(ride.destLat), lng: Number(ride.destLng) };
        dMark = new window.google.maps.Marker({
          position: dPos, map,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#F59E0B', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 7 },
        });
        bounds.extend(dPos);

        if (isHL) {
          line = new window.google.maps.Polyline({
            path: [oPos, dPos], map,
            strokeColor: '#4F46E5', strokeOpacity: 0.7, strokeWeight: 3,
            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }],
          });
        }
      }
      markersRef.current[ride.rideId] = { origin: oMark, dest: dMark, line };
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
  }, [rides, highlighted, onHighlight]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !userLocation) return;
    new window.google.maps.Marker({
      position: { lat: userLocation[0], lng: userLocation[1] },
      map: mapRef.current,
      title: 'Your location',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#4F46E5', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3, scale: 8 },
    });
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      {!gmReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-2xl">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Loading Google Maps...</span>
        </div>
      )}
      <div ref={divRef} className={`w-full h-full transition-opacity duration-300 ${gmReady ? 'opacity-100' : 'opacity-0'}`} aria-label="Ride locations on Google Maps" role="img" />
    </div>
  );
}

// ── Skeleton (UI IMPROVED) ───────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
          <div className="h-3 bg-gray-200 rounded-lg w-1/3" />
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <div className="h-9 bg-gray-200 rounded-xl flex-1" />
        <div className="h-9 bg-gray-200 rounded-xl flex-1" />
      </div>
    </div>
  );
}

// ── Avatar (UNCHANGED) ────────────────────────────────────────────────────
function DAv({ src, name, size = 40 }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken)
    return <img src={src} alt={name ?? 'Driver'} onError={() => setBroken(true)} className="rounded-full object-cover border border-gray-200 flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <User className="text-gray-400" style={{ width: Math.round(size*.52), height: Math.round(size*.52) }} />
    </div>
  );
}

// ── Ride Card (UI REDESIGNED) ────────────────────────────────────────────
const RideCard = memo(function RideCard({ ride, isBest, isHL, onHL, requesting, onRequest }) {
  const seats = ride.availableSeats ?? 0;
  const full  = seats === 0;

  return (
    <article
      id={`ride-${ride.rideId}`}
      role="listitem"
      onClick={() => onHL(ride.rideId)}
      className={`
        bg-white rounded-2xl border shadow-sm p-5 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
        ${isHL ? 'ring-2 ring-indigo-500 shadow-indigo-500/10' : 'border-gray-100'}
      `}
    >
      {/* Best Match Badge */}
      {isBest && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 mb-3">
          <Sparkles className="h-3 w-3" />
          Best Match
        </div>
      )}

      {/* Driver Info + Price */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <DAv src={ride.driver?.profilePic} name={ride.driver?.fullName} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {ride.driver?.fullName ?? 'Driver'}
              </h3>
              {ride.driver?.verified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-200">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
            </div>
            {ride.driver?.trustScore != null && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span className="text-xs font-medium text-gray-600">
                  {Number(ride.driver.trustScore).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-indigo-600 leading-tight">
            {fmtPrice(ride.farePerSeat)}
          </p>
          <p className="text-[11px] text-gray-400">per seat</p>
        </div>
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-xl p-3 mb-4">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="w-0.5 h-6 bg-gray-300 flex-shrink-0" />
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <p className="text-xs text-gray-400 font-medium">Pickup</p>
              <p className="text-sm font-medium text-gray-900 truncate">{ride.originName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Drop-off</p>
              <p className="text-sm font-medium text-gray-900 truncate">{ride.destName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Details Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
          <Clock className="h-3 w-3" />
          {fmtTime(ride.departureTime)}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg ${
          full ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          <Armchair className="h-3 w-3" />
          {full ? 'Full' : `${seats} seat${seats !== 1 ? 's' : ''} left`}
        </span>
        {ride.vehicle && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg">
            <Car className="h-3 w-3" />
            {ride.vehicle.make} {ride.vehicle.model}
          </span>
        )}
        {ride.requiresApproval && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg">
            <Timer className="h-3 w-3" />
            Approval required
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <Link
          to={`/rides/${ride.rideId}`}
          onClick={e => e.stopPropagation()}
          className="flex-1"
        >
          <button className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            View Details
          </button>
        </Link>
        <button
          onClick={e => { e.stopPropagation(); if (!full) onRequest(ride.rideId); }}
          disabled={full || requesting === ride.rideId}
          className={`
            flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
            ${full || requesting === ride.rideId
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
            }
          `}
        >
          {requesting === ride.rideId ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Requesting...
            </span>
          ) : full ? 'Full' : 'Request Seat'}
        </button>
      </div>
    </article>
  );
});

// ── Filter Components (UI IMPROVED) ──────────────────────────────────────
function Chip({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`
        px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all duration-200
        ${selected
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange, icon: Icon }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
      <span className="flex items-center gap-2 text-sm text-gray-700 flex-1">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        {label}
      </span>
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={e => (e.key==='Enter'||e.key===' ') && onChange(!checked)}
        className={`
          relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer
          ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
        `}
      >
        <div className={`
          absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200
          ${checked ? 'left-5' : 'left-1'}
        `} />
      </div>
    </label>
  );
}

function FG({ label, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</h4>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterDrawer({ filters, onChange, onClose }) {
  const [l, setL] = useState({ ...filters });
  const s = (k, v) => setL(f => ({ ...f, [k]: v }));

  return (
    <div role="dialog" aria-modal="true" aria-label="Ride filters" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setL(defaultFilters())}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <FG label="Departure Time">
          {[
            ['all', 'Any time'],
            ['morning', 'Morning (6–12)'],
            ['afternoon', 'Afternoon (12–17)'],
            ['evening', 'Evening (17–21)'],
            ['night', 'Night (21–6)']
          ].map(([v, lb]) => <Chip key={v} selected={l.time===v} onClick={() => s('time', v)}>{lb}</Chip>)}
        </FG>

        <FG label="Price per Seat">
          {[
            ['any', 'Any price'],
            ['under150', 'Under Rs. 150'],
            ['under300', 'Under Rs. 300'],
            ['under500', 'Under Rs. 500']
          ].map(([v, lb]) => <Chip key={v} selected={l.price===v} onClick={() => s('price', v)}>{lb}</Chip>)}
        </FG>

        <FG label="Minimum Seats">
          {[
            ['any', 'Any'],
            ['1', '1+'],
            ['2', '2+'],
            ['3', '3+'],
            ['4', '4+']
          ].map(([v, lb]) => <Chip key={v} selected={l.seats===v} onClick={() => s('seats', v)}>{lb}</Chip>)}
        </FG>

        <FG label="Driver Preferences">
          <Toggle label="Verified drivers only" checked={l.verifiedOnly} onChange={v => s('verifiedOnly', v)} icon={UserCheck} />
        </FG>

        <FG label="Booking Type">
          <Toggle label="Instant booking only" checked={l.instantOnly} onChange={v => s('instantOnly', v)} icon={Zap} />
          <Toggle label="Requires approval" checked={l.approvalOnly} onChange={v => s('approvalOnly', v)} icon={Timer} />
        </FG>
      </div>

      {/* Apply Button */}
      <div className="px-6 py-5 border-t border-gray-100">
        <button
          onClick={() => { onChange(l); onClose(); }}
          className="w-full px-6 py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-xl
            hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'best',     label: 'Best Match' },
  { value: 'cheapest', label: 'Cheapest First' },
  { value: 'earliest', label: 'Earliest Departure' },
  { value: 'rated',    label: 'Highest Rated' },
  { value: 'seats',    label: 'Most Seats' },
];
const PAGE_SIZE = 10;

export default function SearchRidesPage() {
  const gmReady = useGoogleMaps();
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');
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
  const [userLoc,     setUserLoc]     = useState(null);
  const listRef = useRef(null);

  const { data: rawRides = [], isFetching, isError, refetch } = useQuery({
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
    if (sort === 'cheapest') rides.sort((a,b) => a.farePerSeat - b.farePerSeat);
    else if (sort === 'earliest') rides.sort((a,b) => new Date(a.departureTime)-new Date(b.departureTime));
    else if (sort === 'rated')    rides.sort((a,b) => (b.driver?.trustScore??0)-(a.driver?.trustScore??0));
    else if (sort === 'seats')    rides.sort((a,b) => (b.availableSeats??0)-(a.availableSeats??0));
    else                          rides.sort((a,b) => bestScore(b,seats)-bestScore(a,seats));
    return rides;
  }, [rawRides, filters, sort, seats]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const afc = [filters.time!=='all',filters.price!=='any',filters.seats!=='any',filters.verifiedOnly,filters.instantOnly,filters.approvalOnly].filter(Boolean).length;

  const doSearch  = useCallback(() => { setPage(0); setHighlighted(null); setSearchKey({ from, to, date }); }, [from, to, date]);
  const doRequest = useCallback(async rideId => {
    setRequesting(rideId);
    try {
      await bookingService.request({ rideId, seatsRequested: seats });
      toast.success(`Seat${seats>1?'s':''} requested successfully! The driver will confirm shortly.`, {
        icon: '✅',
        style: { borderRadius: '12px' },
      });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Could not request seat.', {
        style: { borderRadius: '12px' },
      });
    }
    finally { setRequesting(null); }
  }, [seats]);

  const doHL = useCallback(rideId => {
    setHighlighted(h => h===rideId ? null : rideId);
    document.getElementById(`ride-${rideId}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, []);

  const doLoc = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setUserLoc([p.coords.latitude, p.coords.longitude]),
      () => toast.error('Location access denied.')
    );
  }, []);

  const hasSearched = !!searchKey;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Search Bar ────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/25">
                <Search className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Find a Ride</h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">Search with Google Maps autocomplete</p>
          </div>

          {/* Search Form */}
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-100">
            <div className="flex flex-wrap items-end gap-3">
              <PlacesInput
                id="srch-from"
                label="From"
                value={from}
                onChange={setFrom}
                placeholder="Origin — city or area"
                gmReady={gmReady}
                icon={MapPin}
              />

              <PlacesInput
                id="srch-to"
                label="To"
                value={to}
                onChange={setTo}
                placeholder="Destination"
                gmReady={gmReady}
                icon={Navigation}
              />

              {/* Date */}
              <div className="flex-shrink-0">
                <label htmlFor="srch-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                <div className="relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer min-w-[140px] transition-colors">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">
                    {(() => {
                      const d = new Date(date + 'T12:00:00');
                      const today = new Date(); today.setHours(0,0,0,0);
                      const tom = new Date(today); tom.setDate(today.getDate()+1);
                      if(d.getTime() === today.getTime()) return 'Today';
                      if(d.getTime() === tom.getTime()) return 'Tomorrow';
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()}
                  </span>
                  <input
                    id="srch-date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Seats */}
              <div className="flex-shrink-0">
                <label htmlFor="srch-seats" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Seats</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                  <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <select
                    id="srch-seats"
                    value={seats}
                    onChange={e => setSeats(Number(e.target.value))}
                    className="bg-transparent border-none outline-none text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} seat{n>1?'s':''}</option>)}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={doSearch}
                disabled={isFetching}
                className="flex-shrink-0 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl
                  hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                  transition-all duration-200 flex items-center gap-2 self-end"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Rides
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results Area ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* LIST COLUMN */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            {hasSearched && !isFetching && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900 font-semibold">{filtered.length}</strong> ride{filtered.length !== 1 ? 's' : ''} found
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Mobile View Toggle */}
                  <div className="flex lg:hidden items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setMobileView('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        mobileView === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" /> List
                    </button>
                    <button
                      onClick={() => setMobileView('map')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        mobileView === 'map' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
                      }`}
                    >
                      <Map className="h-3.5 w-3.5" /> Map
                    </button>
                  </div>

                  {/* Filter Button */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {afc > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                        {afc}
                      </span>
                    )}
                  </button>

                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={e => { setSort(e.target.value); setPage(0); }}
                    className="px-4 py-2 bg-white text-sm font-medium text-gray-700 rounded-xl border border-gray-200 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  {/* My Location */}
                  <button
                    onClick={doLoc}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <LocateFixed className="h-4 w-4" />
                    <span className="hidden sm:inline">My Location</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Map */}
            {hasSearched && mobileView === 'map' && (
              <div className="lg:hidden mb-5 rounded-2xl overflow-hidden border border-gray-200 h-96">
                <RideMap rides={filtered} highlighted={highlighted} onHighlight={doHL} userLocation={userLoc} gmReady={gmReady} />
              </div>
            )}

            {/* Loading Skeletons */}
            {isFetching && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}
              </div>
            )}

            {/* Error State */}
            {!isFetching && isError && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Search Failed</h3>
                <p className="text-sm text-gray-500 mb-6">Something went wrong. Please try again.</p>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}

            {/* Results */}
            {!isFetching && !isError && hasSearched && (
              <>
                {paginated.length > 0 ? (
                  <div ref={listRef} className="space-y-4" role="list">
                    {paginated.map((ride, i) => (
                      <RideCard
                        key={ride.rideId}
                        ride={ride}
                        isBest={page === 0 && i === 0 && sort === 'best'}
                        isHL={highlighted === ride.rideId}
                        onHL={doHL}
                        requesting={requesting}
                        onRequest={doRequest}
                      />
                    ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <SearchX className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No rides found nearby</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                      Try adjusting filters, searching nearby locations, or picking a different date.
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {afc > 0 && (
                        <button
                          onClick={() => { setFilters(defaultFilters()); setPage(0); }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                          <CircleSlash className="h-4 w-4" />
                          Clear Filters
                        </button>
                      )}
                      <button
                        onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                        Try Tomorrow
                      </button>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8" role="navigation">
                    <button
                      disabled={page === 0}
                      onClick={() => { setPage(p => p - 1); listRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm font-medium text-gray-500">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => { setPage(p => p + 1); listRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Pre-Search State */}
            {!hasSearched && !isFetching && (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Navigation className="h-10 w-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Search for Available Rides</h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8">
                  Enter your origin and destination above to find verified drivers heading your way.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="p-2 bg-blue-100 rounded-xl inline-flex mb-2">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Search Routes</h3>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="p-2 bg-emerald-100 rounded-xl inline-flex mb-2">
                      <Star className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Compare Drivers</h3>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="p-2 bg-purple-100 rounded-xl inline-flex mb-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Book Instantly</h3>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAP COLUMN — Desktop only */}
          <div className="hidden lg:block w-[42%] max-w-md flex-shrink-0 sticky top-[180px] h-[calc(100vh-200px)] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {hasSearched && filtered.length > 0 && !isFetching ? (
              <RideMap rides={filtered} highlighted={highlighted} onHighlight={doHL} userLocation={userLoc} gmReady={gmReady} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white gap-4">
                <Map className="h-10 w-10 text-gray-300" />
                <span className="text-sm font-medium text-gray-400">
                  {isFetching ? 'Loading map...' : 'Map appears after search'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} aria-hidden="true" />
          <div className="w-full max-w-sm bg-white flex flex-col h-full border-l border-gray-200 shadow-2xl">
            <FilterDrawer filters={filters} onChange={f => { setFilters(f); setPage(0); }} onClose={() => setShowFilters(false)} />
          </div>
        </div>
      )}
    </div>
  );
}