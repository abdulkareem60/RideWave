import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, Navigation, Search, X, AlertCircle, Check, Info } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaderPromise = null;

function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('Google Maps API key missing'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

// PKR Formatter
const formatPKR = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format PKR with symbol
const formatPKRCompact = (amount) => {
  if (amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(1)}k`;
  }
  return `Rs ${amount}`;
};

// Custom PKR Icon component
const PKRIcon = ({ className = "h-5 w-5" }) => (
  <span className={`inline-flex items-center justify-center font-bold ${className}`}>
    Rs
  </span>
);

// Estimate fare based on distance
const estimateFare = (distanceKm) => {
  // Average PKR per km for ride-sharing in Pakistan
  const baseRate = 25; // PKR per km
  const minimumFare = 100; // Minimum PKR
  const estimatedFare = Math.max(minimumFare, Math.round(distanceKm * baseRate));
  return {
    min: Math.round(estimatedFare * 0.8),
    max: Math.round(estimatedFare * 1.2),
    suggested: estimatedFare,
  };
};

export default function MapPicker({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
  id,
  error,
  companionValue,
  showFareEstimate = false,
}) {
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const mapDivRef = useRef(null);
  const markerRef = useRef(null);
  const acRef = useRef(null);

  const [apiReady, setApiReady] = useState(!!window.google?.maps);
  const [apiError, setApiError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || '');
  const [isSelected, setIsSelected] = useState(!!value?.name);

  // Calculate distance between two points
  const calculateDistance = useCallback(() => {
    if (!value?.lat || !value?.lng || !companionValue?.lat || !companionValue?.lng) return null;

    const R = 6371;
    const dLat = (companionValue.lat - value.lat) * Math.PI / 180;
    const dLng = (companionValue.lng - value.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(value.lat * Math.PI / 180) * Math.cos(companionValue.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;

    return {
      km: distanceKm.toFixed(1),
      miles: (distanceKm * 0.621371).toFixed(1),
    };
  }, [value, companionValue]);

  // Load Google Maps API
  useEffect(() => {
    if (apiReady) return;

    loadGoogleMaps()
      .then(() => setApiReady(true))
      .catch(e => setApiError(e.message));
  }, []);

  // Initialize Autocomplete
  useEffect(() => {
    if (!apiReady || !inputRef.current || acRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pk' },
      fields: ['formatted_address', 'geometry'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();

      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setInputValue(place.formatted_address);
      setIsSelected(true);

      onChange({
        name: place.formatted_address,
        lat,
        lng,
      });
    });

    acRef.current = ac;
  }, [apiReady, onChange]);

  // Initialize/Update Map
  useEffect(() => {
    if (!apiReady || !value?.lat || !value?.lng || !mapDivRef.current) return;

    const latLng = new window.google.maps.LatLng(value.lat, value.lng);

    if (!mapRef.current) {
      const map = new window.google.maps.Map(mapDivRef.current, {
        center: latLng,
        zoom: 15,
        disableDefaultUI: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const marker = new window.google.maps.Marker({
        position: latLng,
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      // Drag end handler
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setInputValue(results[0].formatted_address);
            onChange({
              name: results[0].formatted_address,
              lat: pos.lat(),
              lng: pos.lng(),
            });
          }
        });
      });

      // Map click handler
      map.addListener('click', (e) => {
        marker.setPosition(e.latLng);
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ location: e.latLng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setInputValue(results[0].formatted_address);
            onChange({
              name: results[0].formatted_address,
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          }
        });
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setCenter(latLng);
      mapRef.current.setZoom(15);
      markerRef.current.setPosition(latLng);
    }
  }, [apiReady, value, onChange]);

  const handleClear = () => {
    setInputValue('');
    setIsSelected(false);
    onChange(null);
    if (mapRef.current) {
      mapRef.current = null;
      markerRef.current = null;
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (isSelected) {
      setIsSelected(false);
    }
  };

  const hasLocation = !!(value?.lat && value?.lng);
  const distance = calculateDistance();
  const fareEstimate = distance ? estimateFare(parseFloat(distance.km)) : null;

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
          ${isFocused
            ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-white shadow-sm'
            : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }
          ${hasLocation ? 'border-indigo-200 bg-indigo-50/50' : ''}
        `}>
          {/* Icon */}
          <div className={`
            flex-shrink-0 transition-colors duration-200
            ${isFocused ? 'text-indigo-600' : error ? 'text-red-400' : 'text-gray-400'}
            ${hasLocation ? 'text-indigo-600' : ''}
          `}>
            {Icon ? (
              <Icon className="h-5 w-5" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            placeholder={placeholder || 'Search for a location...'}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400
              ${error ? 'text-red-700' : 'text-gray-900'}
            `}
            autoComplete="off"
          />

          {/* Status Indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!apiReady && !apiError && (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            )}

            {apiError && (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}

            {hasLocation && !error && (
              <div className="p-0.5 bg-emerald-100 rounded-full">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            )}

            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Clear location"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Powered by Google */}
        {apiReady && isFocused && (
          <div className="absolute right-0 -bottom-5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              Powered by Google
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 mt-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-500 font-medium">{error}</p>
        </div>
      )}

      {/* API Error */}
      {apiError && (
        <div className="flex items-center gap-1.5 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-700">Maps failed to load</p>
            <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Distance & Fare Estimate */}
      {distance && showFareEstimate && fareEstimate && (
        <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-2xl p-4 border border-indigo-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Navigation className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Distance</p>
                <p className="text-sm font-bold text-gray-900">
                  {distance.km} km
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <PKRIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Suggested Fare</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatPKR(fareEstimate.suggested)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-200/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Estimated range:</span>
              <span className="font-semibold text-gray-700">
                {formatPKRCompact(fareEstimate.min)} - {formatPKRCompact(fareEstimate.max)}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Info className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <p className="text-[10px] text-gray-400">
                Based on average PKR 25/km. Actual fare may vary.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PKR Fare Reference Card */}
      {hasLocation && !showFareEstimate && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-700">Rs</span>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700">
              Typical fares: {formatPKRCompact(200)} - {formatPKRCompact(2000)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              Set competitive pricing to attract more passengers
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapDivRef}
        className={`
          relative overflow-hidden rounded-2xl border border-gray-200 transition-all duration-300
          ${hasLocation ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          height: hasLocation ? 200 : 0,
          marginTop: hasLocation ? 8 : 0,
        }}
      >
        {/* Map Instructions */}
        {hasLocation && (
          <div className="absolute top-3 left-3 z-10">
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                <p className="text-[11px] font-semibold text-gray-700">
                  Drag marker or click map to adjust
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Coordinates & PKR Indicator */}
        {hasLocation && (
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-mono text-gray-500">
                {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-semibold text-emerald-600">PKR</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Confirmation */}
      {hasLocation && value?.name && !error && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <MapPin className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-700">Selected Location</p>
            <p className="text-sm font-semibold text-indigo-900 mt-0.5 truncate">
              {value.name}
            </p>
          </div>
          <div className="flex-shrink-0 px-2 py-1 bg-white rounded-lg border border-indigo-200">
            <p className="text-[10px] font-semibold text-gray-600">
              {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}