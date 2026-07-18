import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../../utils/googleMapsLoader.js';

/**
 * PlacesAutocomplete — Google Places Autocomplete text input.
 *
 * Reuses the shared googleMapsLoader so no second <script> tag is ever
 * injected, even if this component is mounted alongside MapPicker.jsx or
 * SearchRidesPage's own PlacesInput.
 *
 * Props:
 *   id             {string}    HTML id for the input + label association
 *   label          {string}    Field label
 *   placeholder    {string}    Input placeholder text
 *   value          {string}    Controlled value (place name string)
 *   onChange       {function}  Called with place name string on any change
 *   onPlaceSelect  {function}  Called with { name, lat, lng } on autocomplete
 *                              selection (optional). When the user selects a
 *                              place, BOTH onChange(name) and onPlaceSelect({...})
 *                              fire. onPlaceSelect is null when typing freely.
 *   icon           {ReactNode} Optional Lucide icon element rendered left of input
 *   error          {string}    Optional validation error message
 *   className      {string}    Extra class on the root wrapper div
 */
export default function PlacesAutocomplete({
  id,
  label,
  placeholder,
  value,
  onChange,
  onPlaceSelect,
  icon: Icon,
  error,
  className = '',
}) {
  const gmReady  = useGoogleMaps();
  const inputRef = useRef(null);
  const acRef    = useRef(null);
  const [query, setQuery] = useState(value || '');

  // Sync prop value changes (e.g. parent clearing the field)
  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Attach autocomplete once the Maps API is ready
  useEffect(() => {
    if (!gmReady || !inputRef.current || acRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pk' },
      fields: ['name', 'formatted_address', 'geometry'],
      types: ['geocode', 'establishment'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const name  = place.formatted_address || place.name || inputRef.current.value;
      setQuery(name);

      // Always fire onChange with the display string
      if (onChange) onChange(name);

      // Additionally fire onPlaceSelect with resolved coordinates if available
      if (onPlaceSelect) {
        if (place.geometry?.location) {
          onPlaceSelect({
            name,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        } else {
          // No geometry (manual typed entry) — signal null so parent knows
          // coordinates are not available and can disable submit
          onPlaceSelect(null);
        }
      }
    });

    acRef.current = ac;
  }, [gmReady, onChange, onPlaceSelect]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (onChange) onChange(e.target.value);
    // When the user edits manually, invalidate any previous selection
    if (onPlaceSelect) onPlaceSelect(null);
  };

  const handleClear = () => {
    setQuery('');
    if (onChange) onChange('');
    if (onPlaceSelect) onPlaceSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-white dark:bg-surface-dark-raised
          ${error
            ? 'border-red-500 focus-within:ring-1 focus-within:ring-red-500'
            : 'border-gray-300 dark:border-gray-700 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:focus-within:border-brand-500'
          }
          transition-colors`}
      >
        {Icon && <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />}

        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            bg-transparent border-none outline-none"
        />

        {!gmReady && (
          <Loader2 className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 animate-spin flex-shrink-0" />
        )}

        {query && gmReady && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear"
            className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}