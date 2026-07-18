/**
 * MapPicker — Google Maps Places Autocomplete + interactive pin picker.
 *
 * Props:
 *   label        {string}    Field label shown above input
 *   placeholder  {string}    Input placeholder
 *   value        {object}    { name, lat, lng } — controlled
 *   onChange     {function}  Called with { name, lat, lng } on selection
 *   icon         {ReactNode} Optional Lucide icon
 *   id           {string}    HTML id for accessibility
 *   error        {string}    Validation error message
 *
 * Behaviour:
 *   1. Loads Google Maps JS API (from window — loader injected by useGoogleMaps hook)
 *   2. Attaches Places Autocomplete to the text input (country: pk)
 *   3. On place_changed: resolves lat/lng from geometry and calls onChange
 *   4. Shows a small inline map with a draggable pin below the input
 *      (only when a location is selected — zero height otherwise)
 *   5. Pin drag updates lat/lng via Geocoder reverse geocode
 *   6. Handles null geometry gracefully (manual typing → Geocode on blur)
 *
 * Required env: VITE_GOOGLE_MAPS_API_KEY
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getMapStyles } from '../../utils/mapStyles.js';

import { loadGoogleMaps } from '../../utils/googleMapsLoader.js';

// ── Main component ────────────────────────────────────────────────────────
export default function MapPicker({ label, placeholder, value, onChange, icon: Icon, id, error }) {
  const { isDark } = useTheme();
  const inputRef  = useRef(null);
  const mapDivRef = useRef(null);
  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const acRef     = useRef(null);

  const [apiReady, setApiReady]   = useState(!!window.google?.maps?.places);
  const [apiError, setApiError]   = useState(null);
  const [mapReady, setMapReady]   = useState(false);

  // ── Load Google Maps ────────────────────────────────────────────────────
  useEffect(() => {
    if (apiReady) return;
    loadGoogleMaps()
      .then(() => setApiReady(true))
      .catch(e => setApiError(e.message));
  }, []);

  // ── Attach Places Autocomplete once API is ready ──────────────────────
  useEffect(() => {
    if (!apiReady || !inputRef.current || acRef.current) return;

    if (!window.google?.maps?.places?.Autocomplete) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pk' },
      fields: ['name', 'formatted_address', 'geometry'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) {
        // If no geometry, geocode the typed value
        geocodeAddress(inputRef.current.value);
        return;
      }
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const name = place.formatted_address || place.name || inputRef.current.value;
      onChange({ name, lat, lng });
    });

    acRef.current = ac;
  }, [apiReady, onChange]);

  // ── Geocode fallback (manual text entry) ─────────────────────────────
  const geocodeAddress = useCallback((address) => {
    if (!address || !window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address, region: 'PK' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        onChange({ name: address, lat, lng });
      }
    });
  }, [onChange]);

  // ── Init mini map when a location is selected ─────────────────────────
  useEffect(() => {
    if (!apiReady || !mapDivRef.current || !value?.lat || !value?.lng) return;

    const latLng = new window.google.maps.LatLng(value.lat, value.lng);

    if (!mapRef.current) {
      const map = new window.google.maps.Map(mapDivRef.current, {
        center:            latLng,
        zoom:              14,
        disableDefaultUI:  true,
        zoomControl:       true,
        gestureHandling:   'cooperative',
        mapTypeControl:    false,
        streetViewControl: false,
        styles:            getMapStyles(isDark),
      });

      const marker = new window.google.maps.Marker({
        position:  latLng,
        map,
        draggable: true,
        title:     'Drag to adjust location',
        animation: window.google.maps.Animation.DROP,
      });

      // Reverse geocode on drag end
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === 'OK' && results[0]) {
            onChange({
              name: results[0].formatted_address,
              lat:  pos.lat(),
              lng:  pos.lng(),
            });
            if (inputRef.current) inputRef.current.value = results[0].formatted_address;
          }
        });
      });

      mapRef.current    = map;
      markerRef.current = marker;
      setMapReady(true);
    } else {
      // Update existing map
      mapRef.current.setCenter(latLng);
      markerRef.current.setPosition(latLng);
    }
  }, [apiReady, value?.lat, value?.lng, onChange]);

  // Live theme switching — the map is created once above and never
  // recreated; google.maps.Map doesn't pick up a new `styles` array on
  // its own, so when the user toggles dark mode while this map is
  // already mounted, push the new style set onto the existing instance.
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({ styles: getMapStyles(isDark) });
    }
  }, [isDark]);

  // Update input display when value changes externally
  useEffect(() => {
    if (inputRef.current && value?.name && document.activeElement !== inputRef.current) {
      inputRef.current.value = value.name;
    }
  }, [value?.name]);

  const hasLocation = !!(value?.lat && value?.lng);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Label */}
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {label}
      </label>

      {/* Input row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--color-background-secondary)',
        border: `0.5px solid ${error ? 'var(--color-border-danger)' : 'var(--color-border-tertiary)'}`,
        borderRadius: 'var(--border-radius-md)', padding: '8px 12px',
        transition: 'border-color 0.15s',
      }}>
        {Icon
          ? <Icon size={15} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          : <MapPin size={15} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        }
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          autoComplete="off"
          defaultValue={value?.name ?? ''}
          onBlur={e => { if (!hasLocation && e.target.value) geocodeAddress(e.target.value); }}
          aria-label={label}
          aria-invalid={!!error}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: 'var(--color-text-primary)', width: '100%',
          }}
        />
        {!apiReady && !apiError && (
          <Loader2 size={14} style={{ color: 'var(--color-text-tertiary)', animation: 'spin 1s linear infinite', flexShrink: 0 }} aria-label="Loading Places API" />
        )}
        {hasLocation && apiReady && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-text-success)', flexShrink: 0 }} aria-label="Location confirmed" title="Location confirmed" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-danger)' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* API load error */}
      {apiError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-danger)' }}>
          <AlertCircle size={12} /> {apiError}
        </div>
      )}

      {/* Mini map — appears after location is confirmed */}
      <div
        ref={mapDivRef}
        aria-label={`Map for ${label}`}
        style={{
          height:       hasLocation && apiReady ? 160 : 0,
          marginTop:    hasLocation && apiReady ? 6   : 0,
          borderRadius: 'var(--border-radius-md)',
          overflow:     'hidden',
          border:       hasLocation && apiReady ? '0.5px solid var(--color-border-tertiary)' : 'none',
          transition:   'height 0.25s ease',
        }}
      />

      {hasLocation && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)} — drag pin to fine-tune
        </div>
      )}
    </div>
  );
}

// ── Spin keyframe (self-contained, injected once) ─────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('mp-spin')) {
  const s = document.createElement('style');
  s.id = 'mp-spin';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}