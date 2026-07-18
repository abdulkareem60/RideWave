import { useQuery } from '@tanstack/react-query';
import { Users, Car, DollarSign, ShieldAlert, Activity } from 'lucide-react';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { adminService } from '../../services/adminService.js';
import { formatCurrency } from '../../utils/formatters.js';

function StatCard({ icon: Icon, label, value, color, unit }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {unit === 'PKR' ? formatCurrency(value) : (value ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn:  () => adminService.getDashboard().then(r => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <PageLayout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </PageLayout>
  );

  const d = data;

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform overview · Auto-refreshes every 60s</p>
      </div>

      <div className="space-y-8">
        <Section title="Platform Overview">
          <StatCard icon={Users}      label="Total Users"      value={d?.platform?.totalUsers}     color="bg-brand-500" />
          <StatCard icon={Car}        label="Total Rides"      value={d?.platform?.totalRides}     color="bg-violet-500" />
          <StatCard icon={Activity}   label="Total Bookings"   value={d?.platform?.totalBookings}  color="bg-cyan-500" />
          <StatCard icon={ShieldAlert} label="Avg Trust Score" value={Number(d?.platform?.averageTrustScore ?? 3).toFixed(2)} color="bg-yellow-400" />
        </Section>

        <Section title="Users">
          <StatCard icon={Users} label="Passengers"          value={d?.users?.totalPassengers}    color="bg-sky-500" />
          <StatCard icon={Car}   label="Drivers"             value={d?.users?.totalDrivers}       color="bg-indigo-500" />
          <StatCard icon={Users} label="Active"              value={d?.users?.activeUsers}        color="bg-green-500" />
          <StatCard icon={Users} label="Pending Verification" value={d?.users?.pendingVerification} color="bg-orange-400" />
          <StatCard icon={Users} label="Suspended"           value={d?.users?.suspendedUsers}    color="bg-red-400" />
          <StatCard icon={Users} label="Blocked"             value={d?.users?.blockedUsers}      color="bg-red-700" />
        </Section>

        <Section title="Rides">
          <StatCard icon={Car} label="Scheduled"   value={d?.rides?.scheduledRides}  color="bg-blue-500" />
          <StatCard icon={Car} label="In Progress" value={d?.rides?.inProgressRides} color="bg-green-500" />
          <StatCard icon={Car} label="Completed"   value={d?.rides?.completedRides}  color="bg-gray-500" />
          <StatCard icon={Car} label="Cancelled"   value={d?.rides?.cancelledRides}  color="bg-red-400" />
        </Section>

        <Section title="Finance">
          <StatCard icon={DollarSign} label="Revenue Today"      value={d?.finance?.revenueToday}      color="bg-emerald-500" unit="PKR" />
          <StatCard icon={DollarSign} label="Revenue This Month" value={d?.finance?.revenueThisMonth}  color="bg-emerald-600" unit="PKR" />
          <StatCard icon={DollarSign} label="All-Time Revenue"   value={d?.finance?.revenueAllTime}    color="bg-emerald-700" unit="PKR" />
          <StatCard icon={DollarSign} label="Refunded Payments"  value={d?.finance?.refundedPayments}  color="bg-orange-500" />
        </Section>

        <Section title="Safety">
          <StatCard icon={ShieldAlert} label="Open Reports"           value={d?.safety?.openReports}              color="bg-red-500" />
          <StatCard icon={ShieldAlert} label="Pending Doc Verifications" value={d?.safety?.pendingDocVerifications} color="bg-orange-400" />
          <StatCard icon={ShieldAlert} label="Resolved Reports"       value={d?.safety?.resolvedReports}          color="bg-green-500" />
        </Section>
      </div>
    </PageLayout>
  );
}