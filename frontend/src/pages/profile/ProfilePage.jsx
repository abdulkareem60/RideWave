import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { User, Car, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge from '../../components/common/TrustScoreBadge.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { vehicleService } from '../../services/otherServices.js';

export default function ProfilePage() {
  const { user, isDriver } = useAuth();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn:  () => vehicleService.getAll().then(r => r.data.data),
    enabled:  isDriver,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const addVehicle = useMutation({
    mutationFn: (data) => vehicleService.add(data),
    onSuccess: () => {
      toast.success('Vehicle registered!');
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] });
      setShowAddVehicle(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to add vehicle.'),
  });

  const removeVehicle = useMutation({
    mutationFn: (id) => vehicleService.remove(id),
    onSuccess: () => {
      toast.success('Vehicle removed.');
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to remove vehicle.'),
  });

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

        {/* Profile card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
              {user?.fullName?.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-500">{user?.phone}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div><p className="text-xs text-gray-400">Role</p><p className="text-sm font-medium">{user?.role}</p></div>
            <div><p className="text-xs text-gray-400">Status</p><StatusBadge status={user?.status} /></div>
            <div><p className="text-xs text-gray-400">Trust Score</p><TrustScoreBadge score={user?.trustScore} showLabel /></div>
            <div><p className="text-xs text-gray-400">Email</p><p className="text-sm">{user?.emailVerified ? '✅ Verified' : '⚠️ Unverified'}</p></div>
            <div><p className="text-xs text-gray-400">Phone</p><p className="text-sm">{user?.phoneVerified ? '✅ Verified' : '⚠️ Unverified'}</p></div>
          </div>
        </div>

        {/* Vehicles (drivers only) */}
        {isDriver && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Car className="h-4 w-4 text-brand-500" /> My Vehicles
              </h2>
              <button onClick={() => setShowAddVehicle(!showAddVehicle)}
                      className="btn-secondary text-xs px-3 py-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Vehicle
              </button>
            </div>

            {showAddVehicle && (
              <form onSubmit={handleSubmit(d => addVehicle.mutate(d))}
                    className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Make" id="make" placeholder="Toyota" register={register} error={errors.make}
                             rules={{ required: 'Required' }} />
                  <FormInput label="Model" id="model" placeholder="Corolla" register={register} error={errors.model}
                             rules={{ required: 'Required' }} />
                  <FormInput label="Year" id="year" type="number" placeholder="2020" register={register} error={errors.year}
                             rules={{ required: 'Required', valueAsNumber: true }} />
                  <FormInput label="Plate Number" id="plateNumber" placeholder="ABC-123" register={register} error={errors.plateNumber}
                             rules={{ required: 'Required' }} />
                  <FormInput label="Color" id="color" placeholder="White" register={register} error={errors.color}
                             rules={{}} />
                  <FormInput label="Passenger Seats" id="totalSeats" type="number" placeholder="4" register={register} error={errors.totalSeats}
                             rules={{ required: 'Required', valueAsNumber: true, min: 1, max: 8 }} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAddVehicle(false); reset(); }}
                          className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                          className="btn-primary text-xs px-3 py-1.5">
                    {isSubmitting ? <Spinner size="sm" /> : 'Save Vehicle'}
                  </button>
                </div>
              </form>
            )}

            {loadingVehicles ? (
              <Spinner />
            ) : vehicles?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No vehicles registered.</p>
            ) : (
              <div className="space-y-2">
                {vehicles.map(v => (
                  <div key={v.vehicleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.make} {v.model} ({v.year})</p>
                      <p className="text-xs text-gray-500">{v.plateNumber} · {v.color} · {v.totalSeats} seats</p>
                    </div>
                    <button onClick={() => removeVehicle.mutate(v.vehicleId)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}