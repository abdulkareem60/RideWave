import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { adminService } from '../../services/adminService.js';
import { formatTimeAgo } from '../../utils/formatters.js';

const STATUS_FILTERS = ['', 'OPEN', 'REVIEWED', 'RESOLVED'];
const ACTIONS = ['WARN', 'SUSPEND', 'BLOCK', 'DISMISSED'];

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn:  () => adminService.getReports({ status: statusFilter || undefined }).then(r => r.data.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, action, notes }) => adminService.resolveReport(reportId, { action, notes }),
    onSuccess: () => {
      toast.success('Report resolved.');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to resolve.'),
  });

  const handleResolve = (reportId) => {
    const action = window.prompt(`Action? (${ACTIONS.join(' | ')})`);
    if (!ACTIONS.includes(action)) { toast.error('Invalid action.'); return; }
    const notes = window.prompt('Resolution notes (min 10 chars):');
    if (!notes || notes.length < 10) { toast.error('Notes too short.'); return; }
    resolveMutation.mutate({ reportId, action, notes });
  };

  const reports = data?.content ?? [];

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">User Reports</h1>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${statusFilter === s ? 'bg-brand-600 text-white border-brand-600'
                                        : 'bg-white dark:bg-surface-dark-raised text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports found" description="No reports match the selected filter." />
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.reportId} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                      {r.reason?.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    <span className="font-medium">{r.reporterName}</span>
                    {' reported '}
                    <span className="font-medium text-red-600 dark:text-red-300">{r.reportedName}</span>
                  </p>
                  {r.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTimeAgo(r.createdAt)}</p>
                  {r.resolutionNotes && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1 bg-green-50 dark:bg-green-500/15 px-2 py-1 rounded">
                      Resolution: {r.resolutionNotes}
                    </p>
                  )}
                </div>
                {r.status === 'OPEN' && (
                  <button onClick={() => handleResolve(r.reportId)}
                          disabled={resolveMutation.isPending}
                          className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}