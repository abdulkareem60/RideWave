import { useState } from 'react';

const SIZES = { sm: 32, md: 44, lg: 64, xl: 96 };

/**
 * Avatar — shows a profile image, falling back to initials on error
 * or when no src is provided.
 *
 * size: 'sm' | 'md' | 'lg' | 'xl' | number (px)
 */
export default function Avatar({ src, alt, name, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md);
  const label = alt ?? name ?? '';
  const initials = label
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={label || 'Avatar'}
        onError={() => setBroken(true)}
        className="rounded-full object-cover border border-gray-200 flex-shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0"
      style={{ width: px, height: px }}
      aria-label={label || 'Avatar'}
    >
      <span className="font-bold text-indigo-700" style={{ fontSize: Math.round(px * 0.35) }}>
        {initials}
      </span>
    </div>
  );
}