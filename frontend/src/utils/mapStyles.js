/**
 * Google Maps style arrays for light/dark mode.
 *
 * Shared between MapPicker.jsx and SearchRidesPage.jsx so both maps use
 * identical tile styling and there's one place to adjust the look.
 *
 * MAP_STYLES_LIGHT is empty — an empty array tells the Maps JS API to use
 * its default (light) styling, which is what both components already
 * relied on before dark mode existed.
 *
 * MAP_STYLES_DARK is a standard muted dark theme (similar to the official
 * Google Maps "Night" style), tuned to sit well against the app's
 * surface-dark (#0F1115) background color so the map doesn't look like a
 * jarring light rectangle dropped into an otherwise dark page.
 */

export const MAP_STYLES_LIGHT = [];

export const MAP_STYLES_DARK = [
  { elementType: 'geometry',               stylers: [{ color: '#1A1D23' }] },
  { elementType: 'labels.text.stroke',      stylers: [{ color: '#1A1D23' }] },
  { elementType: 'labels.text.fill',        stylers: [{ color: '#8A8F98' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#C7CAD1' }] },
  { featureType: 'poi',                     elementType: 'labels.text.fill', stylers: [{ color: '#8A8F98' }] },
  { featureType: 'poi.park',                elementType: 'geometry',         stylers: [{ color: '#16291F' }] },
  { featureType: 'poi.park',                elementType: 'labels.text.fill', stylers: [{ color: '#6B9080' }] },
  { featureType: 'road',                    elementType: 'geometry',         stylers: [{ color: '#22262E' }] },
  { featureType: 'road',                    elementType: 'geometry.stroke',  stylers: [{ color: '#1A1D23' }] },
  { featureType: 'road',                    elementType: 'labels.text.fill', stylers: [{ color: '#8A8F98' }] },
  { featureType: 'road.highway',            elementType: 'geometry',         stylers: [{ color: '#2C313A' }] },
  { featureType: 'road.highway',            elementType: 'geometry.stroke',  stylers: [{ color: '#1A1D23' }] },
  { featureType: 'road.highway',            elementType: 'labels.text.fill', stylers: [{ color: '#C7CAD1' }] },
  { featureType: 'transit',                 elementType: 'geometry',         stylers: [{ color: '#22262E' }] },
  { featureType: 'water',                   elementType: 'geometry',         stylers: [{ color: '#0E1A2B' }] },
  { featureType: 'water',                   elementType: 'labels.text.fill', stylers: [{ color: '#4A5568' }] },
];

/** Returns the correct style array for the given theme. */
export function getMapStyles(isDark) {
  return isDark ? MAP_STYLES_DARK : MAP_STYLES_LIGHT;
}