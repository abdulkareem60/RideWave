/**
 * CreateRidePage — driver creates a new ride.
 * UI redesign: Multi-step wizard with premium interactions.
 * ALL backend logic, APIs, validation, React Query, state management,
 * and Google Maps functionality unchanged.
 */

import { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Flag, Car, AlertTriangle, Route, Loader2,
  Clock, Banknote, Users, ChevronRight, CheckCircle2,
  Timer, Zap, Navigation, Calendar, ArrowLeft,
  Info, ShieldCheck, ChevronLeft, DollarSign,
  Armchair, Gauge, Sparkles, Eye, Map,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout    from '../../components/common/PageLayout.jsx';
import Spinner       from '../../components/common/Spinner.jsx';
import MapPicker     from '../../components/rides/MapPicker.jsx';
import RouteMap      from '../../components/rides/RouteMap.jsx';
import { rideService }    from '../../services/rideService.js';
import { vehicleService } from '../../services/otherServices.js';
import { loadGoogleMaps } from '../../utils/googleMapsLoader.js';
import { getMapStyles }  from '../../utils/mapStyles.js';
import { useTheme } from '../../context/ThemeContext.jsx';

// ── Directions API polyline fetcher — UNCHANGED ───────────────────────────
async function fetchAllRoutes(originLat, originLng, destLat, destLng) {
  try {
    await loadGoogleMaps();
    if (!window.google?.maps?.DirectionsService) {
      console.error('[CreateRide] DirectionsService not available');
      return { routes: [], status: 'API_NOT_LOADED' };
    }

    const svc    = new window.google.maps.DirectionsService();
    const result = await svc.route({
      origin:                   { lat: Number(originLat), lng: Number(originLng) },
      destination:              { lat: Number(destLat),   lng: Number(destLng)   },
      travelMode:               'DRIVING',
      provideRouteAlternatives: true,
    });

    const rawRoutes = result?.routes;
    console.info(`[CreateRide] Directions returned ${rawRoutes?.length ?? 0} route(s)`);

    if (!rawRoutes?.length) {
      return { routes: [], status: 'NO_ROUTES' };
    }

    const routes = rawRoutes.map((r, i) => {
      const leg = r.legs?.[0];
      const op   = r.overview_polyline;
      const poly = typeof op === 'string' ? op
                 : (op && typeof op === 'object' && op.points) ? op.points
                 : null;

      if (!poly) console.warn(`[CreateRide] No polyline for route ${i}:`, op);

      return {
        index:     i,
        polyline:  poly,
        distanceM: leg?.distance?.value ?? null,
        durationS: leg?.duration?.value ?? null,
        summary:   r.summary || `Route ${i + 1}`,
      };
    }).filter(r => r.polyline);

    console.info(`[CreateRide] ${routes.length} valid route(s) after extraction:`,
      routes.map(r => `"${r.summary}" ${r.distanceM ? (r.distanceM/1000).toFixed(1)+'km' : ''}`));

    return { routes, status: 'OK' };

  } catch (err) {
    const status = typeof err === 'string' ? err : (err?.message ?? String(err));
    console.error('[CreateRide] Directions failed:', status);
    return { routes: [], status };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDistance(m) {
  if (!m) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}
function fmtDuration(s) {
  if (!s) return null;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function fmtPrice(n) {
  return `PKR ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

// ── Step configuration ────────────────────────────────────────────────────
const STEPS = [
  { id: 'route', label: 'Route', icon: MapPin, description: 'Pick your path' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, description: 'Set departure' },
  { id: 'vehicle', label: 'Vehicle', icon: Car, description: 'Choose your car' },
  { id: 'fare', label: 'Fare & Seats', icon: Banknote, description: 'Set pricing' },
  { id: 'review', label: 'Review', icon: Eye, description: 'Confirm & publish' },
];

// ── Step indicator ────────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = step.id === currentStep;
        const isCompleted = steps.findIndex(s => s.id === currentStep) > i;
        const isClickable = isCompleted;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200
                ${isActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md scale-105'
                  : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <step.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-4 h-px ${isCompleted ? 'bg-emerald-300 dark:bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Premium input component ──────────────────────────────────────────────
const PremiumInput = forwardRef(function PremiumInput({
  id, type = 'text', label, error, icon: Icon, placeholder, hint, ...rest
}, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className={`
        relative flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900
        rounded-xl border-2 transition-all duration-200
        ${error
          ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-500/5'
          : focused
            ? 'border-gray-900 dark:border-white shadow-md shadow-gray-900/5'
            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}>
        {Icon && (
          <Icon className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
            error ? 'text-red-400' : focused ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
          }`} />
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 min-w-0"
          {...rest}
        />
        {focused && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />
          </motion.div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500 dark:text-red-400"
        >
          <AlertTriangle className="h-3 w-3" />
          {error}
        </motion.p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
});

// ── Vehicle card ──────────────────────────────────────────────────────────
function VehicleSelectionCard({ vehicle, selected, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(vehicle.vehicleId)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
        ${selected
          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800/50 shadow-lg'
          : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Vehicle visualization */}
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-200
          ${selected ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'}
        `}>
          <Car className={`h-8 w-8 ${selected ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {vehicle.year && `${vehicle.year} · `}{vehicle.color}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Armchair className="h-3.5 w-3.5" />
              {vehicle.totalSeats || 4} seats
            </span>
            {vehicle.plateNumber && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Gauge className="h-3.5 w-3.5" />
                {vehicle.plateNumber}
              </span>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        <div className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
          ${selected
            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white'
            : 'border-gray-200 dark:border-gray-700'
          }
        `}>
          {selected && <CheckCircle2 className="h-4 w-4 text-white dark:text-gray-900" />}
        </div>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 -right-2"
        >
          <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
            SELECTED
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

// ── Seat selector chip ────────────────────────────────────────────────────
function SeatChip({ number, selected, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(number)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-200
        ${selected
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg'
          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      <span className="text-lg font-bold">{number}</span>
      <span className="text-[10px] font-medium opacity-75">{number === 1 ? 'seat' : 'seats'}</span>
    </motion.button>
  );
}

// ── Fare calculator ──────────────────────────────────────────────────────
function FareCalculator({ totalFare, seats, onFareChange, onSeatsChange }) {
  const perSeatFare = seats > 0 ? Math.round(totalFare / seats) : 0;
  const suggestedFares = [500, 800, 1200, 1500, 2000];

  return (
    <div className="space-y-6">
      {/* Quick fare suggestions */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Select
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestedFares.map(fare => (
            <motion.button
              key={fare}
              type="button"
              onClick={() => onFareChange(fare)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${totalFare === fare
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {fmtPrice(fare)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom fare input */}
      <PremiumInput
        id="total-fare"
        type="number"
        label="Total Trip Fare"
        placeholder="Enter amount"
        icon={DollarSign}
        value={totalFare || ''}
        onChange={(e) => onFareChange(Number(e.target.value))}
        hint="Total amount you'll earn for the entire trip"
      />

      {/* Seat selector */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Available Seats
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <SeatChip
              key={num}
              number={num}
              selected={seats === num}
              onSelect={onSeatsChange}
            />
          ))}
        </div>
      </div>

      {/* Live breakdown */}
      {totalFare > 0 && seats > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800"
        >
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Fare Breakdown</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total fare</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtPrice(totalFare)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Seats offered</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{seats}</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Per seat</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{fmtPrice(perSeatFare)}</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Each passenger pays {fmtPrice(perSeatFare)} per seat
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Route status badge ────────────────────────────────────────────────────
function RouteStatusBadge({ fetchingRoute, routePolyline, routeStatus, routeDistanceM, routeDurationS, km, routeCount }) {
  if (!routePolyline && !fetchingRoute && !routeStatus) return null;

  let config;
  if (fetchingRoute) {
    config = { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: Loader2, msg: 'Calculating best route...' };
  } else if (routePolyline) {
    config = {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2,
      msg: `Route found · ${fmtDistance(routeDistanceM)} · ~${fmtDuration(routeDurationS)}${routeCount > 1 ? ` · ${routeCount} alternatives` : ''}`
    };
  } else {
    config = {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      icon: AlertTriangle,
      msg: `Using straight-line distance · ${km} km`
    };
  }

  const Icon = config.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${config.bg} ${config.text} text-xs font-medium`}
    >
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${fetchingRoute ? 'animate-spin' : ''}`} />
      {config.msg}
    </motion.div>
  );
}

// ── Route alternative picker ──────────────────────────────────────────────
function RouteAlternativePicker({ routes, selectedIdx, onSelect, origin, dest, gmReady, isDark }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!gmReady || !divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center: { lat: Number(origin.lat), lng: Number(origin.lng) },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
      styles: getMapStyles(isDark),
    });
  }, [gmReady]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setOptions({ styles: getMapStyles(isDark) });
  }, [isDark]);

  useEffect(() => {
    if (!gmReady || !mapRef.current || !window.google?.maps || !routes.length) return;

    const map = mapRef.current;
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    routes.forEach((route, i) => {
      if (!route.polyline) return;
      const isSelected = i === selectedIdx;
      const pts = decodePolylineCP(route.polyline);
      if (!pts.length) return;

      const line = new window.google.maps.Polyline({
        path: pts,
        map,
        strokeColor: isSelected ? '#111827' : '#D1D5DB',
        strokeOpacity: isSelected ? 1 : 0.5,
        strokeWeight: isSelected ? 5 : 3,
        zIndex: isSelected ? 10 : 1,
        clickable: true,
      });

      line.addListener('click', () => onSelect(i));
      polylinesRef.current.push(line);
      pts.forEach(p => bounds.extend(p));
    });

    const oMark = new window.google.maps.Marker({
      position: { lat: Number(origin.lat), lng: Number(origin.lng) },
      map,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#16a34a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
      zIndex: 20,
    });
    const dMark = new window.google.maps.Marker({
      position: { lat: Number(dest.lat), lng: Number(dest.lng) },
      map,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#dc2626', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
      zIndex: 20,
    });
    polylinesRef.current.push(oMark, dMark);

    if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
  }, [gmReady, routes, selectedIdx, onSelect, origin, dest]);

  if (!gmReady) return (
    <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl">
      <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div ref={divRef} className="h-48 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800" />

      <div className="grid grid-cols-1 gap-2">
        {routes.map((route, i) => {
          const isSelected = i === selectedIdx;
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`
                flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
                ${isSelected
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isSelected ? 'bg-white dark:bg-gray-900' : 'bg-gray-400 dark:bg-gray-600'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{route.summary || `Route ${i + 1}`}</p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70 dark:text-gray-900/70' : 'text-gray-500 dark:text-gray-400'}`}>
                  {route.distanceM && `${(route.distanceM / 1000).toFixed(1)} km`}
                  {route.distanceM && route.durationS && ' · '}
                  {route.durationS && `~${Math.round(route.durationS / 60)} min`}
                </p>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function decodePolylineCP(encoded) {
  if (!encoded) return [];
  const result = []; let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, val = 0;
    do { b = encoded.charCodeAt(idx++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (val & 1) ? ~(val >> 1) : (val >> 1);
    shift = 0; val = 0;
    do { b = encoded.charCodeAt(idx++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (val & 1) ? ~(val >> 1) : (val >> 1);
    result.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return result;
}

// ── Live ride preview card ────────────────────────────────────────────────
function LivePreviewCard({
  origin, dest, routePolyline, routeDistanceM, routeDurationS,
  totalFare, seats, selectedVehicle, departureTime, requiresApproval,
  currentStep
}) {
  const hasRoute = origin?.lat && dest?.lat;

  const formatDeparture = (dt) => {
    if (!dt) return null;
    try {
      return new Date(dt).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    } catch { return dt; }
  };

  return (
    <motion.div
      layout
      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden sticky top-6"
    >
      {/* Map area */}
      {hasRoute ? (
        <div className="relative">
          <RouteMap
            originLat={origin.lat}
            originLng={origin.lng}
            originName={origin.name}
            destLat={dest.lat}
            destLng={dest.lng}
            destName={dest.name}
            routePolyline={routePolyline}
            height="240px"
          />
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <div className="flex-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-lg">
              {fmtDistance(routeDistanceM) || '—'}
            </div>
            <div className="flex-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-lg">
              {fmtDuration(routeDurationS) || '—'}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-60 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Map className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Set your route to see the map</p>
        </div>
      )}

      {/* Ride details */}
      <div className="p-5 space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Live Preview
        </h3>

        {hasRoute && (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30" />
              <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500/50 to-red-500/50 my-1" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900/30" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{origin.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Origin</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{dest.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Destination</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview details based on current step */}
        <AnimatePresence mode="wait">
          {departureTime && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl"
            >
              <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDeparture(departureTime)}</span>
            </motion.div>
          )}

          {selectedVehicle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl"
            >
              <Car className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedVehicle.make} {selectedVehicle.model}
              </span>
            </motion.div>
          )}

          {totalFare > 0 && seats > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total fare</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{fmtPrice(totalFare)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Per seat ({seats} seats)</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{fmtPrice(Math.round(totalFare / seats))}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Booking mode</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {requiresApproval ? 'Manual approval' : 'Instant'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export default function CreateRidePage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm();

  const [currentStep, setCurrentStep] = useState('route');

  // Location state
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [locationErrors, setLocationErrors] = useState({});

  // Route state
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeStatus, setRouteStatus] = useState(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const fetchedRef = useRef({ key: null });

  const { isDark } = useTheme();
  const selectedRoute = routes[selectedRouteIdx] ?? null;
  const routePolyline = selectedRoute?.polyline ?? null;
  const routeDistanceM = selectedRoute?.distanceM ?? null;
  const routeDurationS = selectedRoute?.durationS ?? null;

  // Local state for fare calculator
  const [localFare, setLocalFare] = useState(0);
  const [localSeats, setLocalSeats] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { data: vehiclesData } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => vehicleService.getAll().then(r => r.data.data),
  });
  const vehicles = vehiclesData ?? [];

  // Watch form values
  const departureTime = watch('departureTime');
  const requiresApproval = watch('requiresApproval');
  const watchedTotalFare = watch('totalTripFare');
  const watchedSeats = watch('seats');

  // Sync vehicle
  useEffect(() => {
    setValue('vehicleId', selectedVehicleId);
  }, [selectedVehicleId, setValue]);

  // Fetch routes
  useEffect(() => {
    if (!origin?.lat || !origin?.lng || !dest?.lat || !dest?.lng) {
      setRoutes([]); setRouteStatus(null); setSelectedRouteIdx(0);
      fetchedRef.current.key = null;
      return;
    }

    const key = `${Number(origin.lat).toFixed(5)},${Number(origin.lng).toFixed(5)}`
              + `→${Number(dest.lat).toFixed(5)},${Number(dest.lng).toFixed(5)}`;

    if (fetchedRef.current.key === key) return;
    fetchedRef.current.key = key;

    setRoutes([]); setSelectedRouteIdx(0); setRouteStatus(null); setFetchingRoute(true);

    fetchAllRoutes(
      Number(origin.lat), Number(origin.lng),
      Number(dest.lat), Number(dest.lng)
    ).then(({ routes: fetched, status }) => {
      setRoutes(fetched);
      setRouteStatus(status);
      setSelectedRouteIdx(0);
      setFetchingRoute(false);
    });
  }, [origin?.lat, origin?.lng, dest?.lat, dest?.lng]);

  const distanceKm = useCallback(() => {
    if (!origin?.lat || !dest?.lat) return null;
    const R = 6371;
    const dL = (dest.lat - origin.lat) * Math.PI / 180;
    const dG = (dest.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dL/2)**2 + Math.cos(origin.lat*Math.PI/180) * Math.cos(dest.lat*Math.PI/180) * Math.sin(dG/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  }, [origin, dest]);

  const validateLocations = () => {
    const errs = {};
    if (!origin?.name) errs.origin = 'Pick an origin from the suggestions';
    if (!origin?.lat) errs.origin = 'Origin coordinates missing';
    if (!dest?.name) errs.dest = 'Pick a destination from the suggestions';
    if (!dest?.lat) errs.dest = 'Destination coordinates missing';
    setLocationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (data) => {
    if (!validateLocations()) return;
    try {
      await rideService.create({
        originName: origin.name,
        originLat: origin.lat,
        originLng: origin.lng,
        destName: dest.name,
        destLat: dest.lat,
        destLng: dest.lng,
        routePolyline: routePolyline ?? undefined,
        routeDistanceM: routeDistanceM ?? undefined,
        routeDurationS: routeDurationS ?? undefined,
        departureTime: data.departureTime,
        totalTripFare: parseFloat(data.totalTripFare),
        seats: parseInt(data.seats),
        vehicleId: data.vehicleId,
        requiresApproval: data.requiresApproval === 'true',
      });
      toast.success('Ride published successfully!');
      navigate('/rides/my');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message ?? 'Failed to create ride.';
      if (status === 400 && msg.includes('overlapping')) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    }
  };

  const km = distanceKm();
  const selectedVehicle = vehicles.find(v => v.vehicleId === selectedVehicleId);

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'route': return origin?.lat && dest?.lat;
      case 'schedule': return !!departureTime;
      case 'vehicle': return !!selectedVehicleId;
      case 'fare': return localFare > 0 && localSeats > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    const stepOrder = STEPS.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      // Sync fare data when leaving fare step
      if (currentStep === 'fare') {
        setValue('totalTripFare', localFare);
        setValue('seats', localSeats);
      }
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder = STEPS.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Create a New Ride
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Offer seats to passengers heading your way
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-6 overflow-x-auto pb-2">
            <StepIndicator
              steps={STEPS}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>
        </motion.div>

        {/* No vehicle warning */}
        {vehicles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-2xl mb-6"
          >
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No vehicle registered</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Add a vehicle in your profile before creating a ride.
              </p>
            </div>
          </motion.div>
        )}

        {/* Main content: Form + Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form area */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <AnimatePresence mode="wait">
                {/* Step: Route */}
                {currentStep === 'route' && (
                  <motion.div
                    key="route"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Where are you going?</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set your pickup and drop-off points</p>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex flex-col items-center pt-3 flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30" />
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-emerald-500/50 to-red-500/50 my-2 min-h-[40px]" />
                          <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900/30" />
                        </div>

                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Origin</p>
                            <MapPicker
                              id="origin-picker"
                              label=""
                              placeholder="City, area, or landmark..."
                              value={origin}
                              onChange={loc => { setOrigin(loc); setLocationErrors(e => ({ ...e, origin: null })); }}
                              icon={MapPin}
                              error={locationErrors.origin}
                            />
                            {locationErrors.origin && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />{locationErrors.origin}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Destination</p>
                            <MapPicker
                              id="dest-picker"
                              label=""
                              placeholder="City, area, or landmark..."
                              value={dest}
                              onChange={loc => { setDest(loc); setLocationErrors(e => ({ ...e, dest: null })); }}
                              icon={Flag}
                              error={locationErrors.dest}
                            />
                            {locationErrors.dest && (
                              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />{locationErrors.dest}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Route status */}
                      {(origin?.lat && dest?.lat) && (
                        <RouteStatusBadge
                          fetchingRoute={fetchingRoute}
                          routePolyline={routePolyline}
                          routeStatus={routeStatus}
                          routeDistanceM={routeDistanceM}
                          routeDurationS={routeDurationS}
                          km={km}
                          routeCount={routes.length}
                        />
                      )}

                      {/* Route alternatives */}
                      {routes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                            Available Routes
                          </p>
                          <RouteAlternativePicker
                            routes={routes}
                            selectedIdx={selectedRouteIdx}
                            onSelect={setSelectedRouteIdx}
                            origin={origin}
                            dest={dest}
                            gmReady={true}
                            isDark={isDark}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step: Schedule */}
                {currentStep === 'schedule' && (
                  <motion.div
                    key="schedule"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">When do you leave?</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set your departure date and time</p>
                      </div>

                      <PremiumInput
                        id="departure-time"
                        type="datetime-local"
                        label="Departure Date & Time"
                        icon={Calendar}
                        error={errors.departureTime?.message}
                        {...register('departureTime', { required: 'Departure time is required' })}
                      />

                      {/* Booking approval mode */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                          Booking Mode
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'false', label: 'Instant', sub: 'Auto-confirm all requests', icon: Zap },
                            { value: 'true', label: 'Manual', sub: 'Review each request', icon: ShieldCheck },
                          ].map(opt => {
                            const isSelected = watch('requiresApproval') === opt.value ||
                              (opt.value === 'false' && !watch('requiresApproval'));
                            return (
                              <label
                                key={opt.value}
                                className={`
                                  flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
                                  ${isSelected
                                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800/50'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                  }
                                `}
                              >
                                <input
                                  type="radio"
                                  value={opt.value}
                                  {...register('requiresApproval')}
                                  defaultChecked={opt.value === 'false'}
                                  className="sr-only"
                                />
                                <opt.icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                                <div>
                                  <p className={`text-sm font-semibold ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {opt.label}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.sub}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step: Vehicle */}
                {currentStep === 'vehicle' && (
                  <motion.div
                    key="vehicle"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Choose your vehicle</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select which car you'll be driving</p>
                      </div>

                      <input type="hidden" {...register('vehicleId', { required: 'Please select a vehicle' })} />

                      {vehicles.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Car className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No vehicles yet</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Add a vehicle in your profile to continue
                          </p>
                          <a
                            href="/profile"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                          >
                            Go to Profile <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {vehicles.map(v => (
                            <VehicleSelectionCard
                              key={v.vehicleId}
                              vehicle={v}
                              selected={selectedVehicleId === v.vehicleId}
                              onSelect={setSelectedVehicleId}
                            />
                          ))}
                          {errors.vehicleId && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />{errors.vehicleId.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step: Fare & Seats */}
                {currentStep === 'fare' && (
                  <motion.div
                    key="fare"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Set fare & seats</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">How much will you charge and how many passengers can join?</p>
                      </div>

                      {/* Hidden form fields */}
                      <input type="hidden" {...register('totalTripFare', { required: true })} />
                      <input type="hidden" {...register('seats', { required: true })} />

                      <FareCalculator
                        totalFare={localFare || watchedTotalFare || 0}
                        seats={localSeats || watchedSeats || 0}
                        onFareChange={setLocalFare}
                        onSeatsChange={setLocalSeats}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step: Review */}
                {currentStep === 'review' && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Review your ride</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Confirm all details before publishing</p>
                      </div>

                      <div className="space-y-4">
                        {/* Route summary */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Route</h3>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center pt-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{origin?.name}</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dest?.name}</p>
                            </div>
                          </div>
                          {(routeDistanceM || routeDurationS) && (
                            <div className="flex gap-4 mt-3 ml-7">
                              {routeDistanceM && <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDistance(routeDistanceM)}</span>}
                              {routeDurationS && <span className="text-xs text-gray-500 dark:text-gray-400">~{fmtDuration(routeDurationS)}</span>}
                            </div>
                          )}
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Departure</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {departureTime ? new Date(departureTime).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                              }) : '—'}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vehicle</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : '—'}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Fare</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtPrice(watchedTotalFare || localFare)}</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Seats</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{watchedSeats || localSeats} seats</p>
                          </div>
                        </div>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={isSubmitting || vehicles.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-gray-900/10"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Publishing...</>
                        ) : (
                          <><Sparkles className="h-5 w-5" /> Publish Ride</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation buttons */}
              {currentStep !== 'review' && (
                <div className="flex gap-3 mt-6">
                  {STEPS.findIndex(s => s.id === currentStep) > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNext()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-gray-900/10"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Preview sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <LivePreviewCard
              origin={origin}
              dest={dest}
              routePolyline={routePolyline}
              routeDistanceM={routeDistanceM}
              routeDurationS={routeDurationS}
              totalFare={watchedTotalFare || localFare}
              seats={watchedSeats || localSeats}
              selectedVehicle={selectedVehicle}
              departureTime={departureTime}
              requiresApproval={requiresApproval === 'true'}
              currentStep={currentStep}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}