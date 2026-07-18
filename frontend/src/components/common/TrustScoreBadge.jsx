import { formatTrustScore } from '../../utils/formatters.js';

export default function TrustScoreBadge({ score, showLabel = false }) {
  const s = Number(score ?? 0);
  const color = s >= 4 ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/15 dark:border-green-500/30'
              : s >= 2.5 ? 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-500/15 dark:border-yellow-500/30'
              : 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/15 dark:border-red-500/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${color}`}>
      ⭐ {formatTrustScore(s)}
      {showLabel && <span className="font-normal text-current opacity-70">trust</span>}
    </span>
  );
}