import { getStatusStyle, getStatusLabel } from '../../utils/formatters.js';

export default function StatusBadge({ status, size = 'sm' }) {
  if (!status) return null;
  return (
    <span className={`badge ${getStatusStyle(status)} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {getStatusLabel(status)}
    </span>
  );
}