import { useEffect, useState } from 'react';

/**
 * Shared Google Maps JS API loader — single source of truth.
 *
 * Previously duplicated in MapPicker.jsx and SearchRidesPage.jsx; now both
 * import from here, and the new HomePage hero search also imports from here
 * rather than adding a third copy.
 *
 * Uses the callback= pattern so window.google.maps.places is fully
 * initialised before the promise resolves.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let _gmapsPromise = null;

export function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_gmapsPromise) return _gmapsPromise;

  _gmapsPromise = new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set in .env'));
      return;
    }
    const cbName = '__gmapsReady_' + Date.now();
    window[cbName] = () => { delete window[cbName]; resolve(); };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.onerror = () => {
      delete window[cbName];
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });

  return _gmapsPromise;
}

/** Returns true once window.google.maps.places is ready. */
export function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places);
  useEffect(() => {
    if (ready) return;
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch(err => console.error('[GoogleMaps]', err.message));
  }, [ready]);
  return ready;
}