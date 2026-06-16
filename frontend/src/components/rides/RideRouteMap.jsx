import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useState, useEffect } from 'react';

const LIBRARIES = ['places'];
const mapContainerStyle = { width: '100%', height: '280px', borderRadius: '12px' };

export default function RideRouteMap({ ride }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  });

  const [directions, setDirections] = useState(null);

  const hasCoords = ride.originLat && ride.originLng && ride.destLat && ride.destLng;

  useEffect(() => {
    if (!isLoaded || !hasCoords) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin:      { lat: Number(ride.originLat), lng: Number(ride.originLng) },
        destination: { lat: Number(ride.destLat),   lng: Number(ride.destLng)   },
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  }, [isLoaded, ride]);

  if (!isLoaded) return (
    <div className="h-[280px] bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  );

  if (!hasCoords) return null;   // ride has no coordinates, skip map

  const originPos = { lat: Number(ride.originLat), lng: Number(ride.originLng) };
  const destPos   = { lat: Number(ride.destLat),   lng: Number(ride.destLng)   };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={originPos}
      zoom={10}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {directions
        ? <DirectionsRenderer directions={directions} />
        : (
          <>
            <Marker position={originPos} label="A" />
            <Marker position={destPos}   label="B" />
          </>
        )
      }
    </GoogleMap>
  );
}