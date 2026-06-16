import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge from '../../components/common/TrustScoreBadge.jsx';
import { adminService } from '../../services/adminService.js';
import { formatDateShort } from '../../utils/formatters.js';

const ROLES     = ['', 'PASSENGER', 'DRIVER', 'ADMIN'];
const STATUSES  = ['', 'ACTIVE', 'PENDING', 'PENDING_VERIFICATION', 'SUSPENDED', 'BLOCKED'];
const ACTIONS   = [
  { status: 'ACTIVE',    label: 'Activate',  color: 'text-green-600' },
  { status: 'SUSPENDED', label: 'Suspend',   color: 'text-orange-500' },
  { status: 'BLOCKED',   label: 'Block',     color: 'text-red-600' },
];

export default function UserManagementPage() {
  const [search, setSearch] = useState('');
  const [role,   setRole]   = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, status, page],
    queryFn:  () => adminService.listUsers({ search, role: role || undefined, status: status || undefined, page })
                               .then(r => r.data.data),
    keepPreviousData: true,
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status, reason }) => adminService.updateUserStatus(userId, { status, reason }),
    onSuccess: () => {
      toast.success('User status updated.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const handleAction = (userId, newStatus) => {
    const reason = window.prompt(`Reason for ${newStatus}:`);
    if (!reason) return;
    statusMutation.mutate({ userId, status: newStatus, reason });
  };

  const users      = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">User Management</h1>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search name or email…"
                   value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <select className="input w-36" value={role} onChange={e => { setRole(e.target.value); setPage(0); }}>
            {ROLES.map(r => <option key={r} value={r}>{r || 'All Roles'}</option>)}
          </select>
          <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Name', 'Email', 'Role', 'Status', 'Trust', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3"><span className="badge bg-brand-50 text-brand-700">{u.role}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3"><TrustScoreBadge score={u.trustScore} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDateShort(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center flex-wrap">
                          {u.role === 'DRIVER' && u.status === 'PENDING_VERIFICATION' && (
                            <Link to="/admin/drivers/verify"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline">
                              <ShieldAlert className="h-3 w-3" /> Review documents
                            </Link>
                          )}
                          {ACTIONS
                            .filter(a => a.status !== u.status)
                            .filter(a => !(
                              a.status === 'ACTIVE' &&
                              u.role === 'DRIVER' &&
                              u.status === 'PENDING_VERIFICATION'
                            ))
                            .map(a => (
                              <button key={a.status}
                                      onClick={() => handleAction(u.userId, a.status)}
                                      className={`text-xs font-medium ${a.color} hover:underline`}>
                                {a.label}
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button className="btn-secondary px-4" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary px-4" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}