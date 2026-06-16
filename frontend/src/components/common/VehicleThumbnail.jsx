import { Car } from 'lucide-react';

/**
 * VehicleThumbnail — shows a vehicle's photo, falling back to a Lucide
 * Car icon in a rounded box when no photo is available.
 */
const SIZES = {
  sm: { box: 'h-10 w-10 rounded-lg', icon: 'h-5 w-5' },
  md: { box: 'h-16 w-16 rounded-xl', icon: 'h-7 w-7' },
  lg: { box: 'h-32 w-full rounded-xl', icon: 'h-10 w-10' },
};

export default function VehicleThumbnail({ src, size = 'md', alt = 'Vehicle photo', className = '' }) {
  const { box, icon } = SIZES[size] ?? SIZES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${box} object-cover border border-gray-200 flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${box} bg-gray-100 flex items-center justify-center flex-shrink-0 ${className}`}>
      <Car className={`${icon} text-gray-400`} />
    </div>
  );
}