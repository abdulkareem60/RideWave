import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Navigation, Car, AlertTriangle, Clock,
  Users, CarFront, Shield, ArrowLeft,
  Info, Route, Calendar, Check, ChevronDown, Star,
  Zap, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import MapPicker from '../../components/rides/MapPicker.jsx';
import { rideService } from '../../services/rideService.js';
import { vehicleService } from '../../services/otherServices.js';
import { rules } from '../../utils/validators.js';

// PKR Icon component to replace IndianRupee
const PKRIcon = ({ className = "h-5 w-5" }) => (
  <span className={`inline-flex items-center justify-center font-bold text-current ${className}`}>
    Rs
  </span>
);

export default function CreateRidePage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      requiresApproval: 'false',
      seats: 3,
    }
  });

  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [locationErrors, setLocationErrors] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const { data: vehiclesData } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => vehicleService.getAll().then(r => r.data.data),
  });
  const vehicles = vehiclesData ?? [];

  const distanceKm = useCallback(() => {
    if (!origin?.lat || !dest?.lat) return null;
    const R = 6371;
    const dL = (dest.lat - origin.lat) * Math.PI / 180;
    const dG = (dest.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dL/2)**2 + Math.cos(origin.lat*Math.PI/180) * Math.cos(dest.lat*Math.PI/180) * Math.sin(dG/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return {
      km: distance.toFixed(1),
      miles: (distance * 0.621371).toFixed(1)
    };
  }, [origin, dest]);

  const validateLocations = () => {
    const errs = {};
    if (!origin?.name) errs.origin = 'Please select an origin location';
    if (!origin?.lat) errs.origin = 'Origin coordinates required — select from suggestions';
    if (!dest?.name) errs.dest = 'Please select a destination';
    if (!dest?.lat) errs.dest = 'Destination coordinates required — select from suggestions';
    if (origin?.lat && dest?.lat && origin.lat === dest.lat && origin.lng === dest.lng) {
      errs.dest = 'Origin and destination cannot be the same';
    }
    setLocationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (data) => {
    if (!validateLocations()) return;

    const loadingToast = toast.loading('Creating your ride...');

    try {
      await rideService.create({
        originName: origin.name,
        originLat: origin.lat,
        originLng: origin.lng,
        destName: dest.name,
        destLat: dest.lat,
        destLng: dest.lng,
        departureTime: data.departureTime,
        farePerSeat: parseFloat(data.farePerSeat),
        seats: parseInt(data.seats),
        vehicleId: data.vehicleId,
        requiresApproval: data.requiresApproval === 'true',
      });

      toast.dismiss(loadingToast);
      toast.success('Ride created successfully!', {
        icon: '🚗',
        style: { borderRadius: '12px', background: '#1e3a5f', color: '#fff' },
        duration: 3000,
      });

      setTimeout(() => navigate('/rides/my'), 500);
    } catch (err) {
      toast.dismiss(loadingToast);
      const msg = err.response?.data?.message ?? 'Failed to create ride. Please try again.';
      toast.error(msg, {
        style: { borderRadius: '12px' },
      });
    }
  };

  const distance = distanceKm();
  const estimatedDuration = distance ? Math.round(distance.km / 60 * 60) : null;

  return (
    <PageLayout>
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <Route className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Create a New Ride
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Offer a ride and share travel costs with passengers
              </p>
            </div>
          </div>
        </div>

        {/* No Vehicle Warning */}
        {vehicles.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  No Vehicle Registered
                </p>
                <p className="text-sm text-amber-700">
                  You need to register a vehicle before creating a ride.{' '}
                  <a
                    href="/profile"
                    className="font-semibold text-amber-800 underline hover:text-amber-900"
                  >
                    Add a vehicle in your profile
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Ride Details</h2>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

              {/* Route Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Route Information
                  </h3>
                </div>

                {/* Origin */}
                <div className="relative">
                  <MapPicker
                    id="origin-picker"
                    label="Origin"
                    placeholder="Where are you departing from?"
                    value={origin}
                    onChange={loc => {
                      setOrigin(loc);
                      setLocationErrors(e => ({ ...e, origin: null }));
                    }}
                    icon={MapPin}
                    error={locationErrors.origin}
                  />
                </div>

                {/* Route Connector */}
                <div className="flex items-center justify-center -my-2 relative z-10">
                  <div className="p-1.5 bg-indigo-100 rounded-full">
                    <ArrowLeft className="h-4 w-4 text-indigo-600 rotate-90" />
                  </div>
                </div>

                {/* Destination */}
                <div className="relative">
                  <MapPicker
                    id="dest-picker"
                    label="Destination"
                    placeholder="Where are you heading to?"
                    value={dest}
                    onChange={loc => {
                      setDest(loc);
                      setLocationErrors(e => ({ ...e, dest: null }));
                    }}
                    icon={Navigation}
                    error={locationErrors.dest}
                  />
                </div>

                {/* Distance & Duration Hint */}
                {distance && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-4 border border-indigo-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Route className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Distance</p>
                          <p className="text-sm font-bold text-gray-900">
                            {distance.km} km
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Clock className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Est. Duration</p>
                          <p className="text-sm font-bold text-gray-900">
                            ~{estimatedDuration} min
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Straight-line distance. Actual road distance may vary.
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule Section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Schedule
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Departure Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-200 text-sm
                      focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                      ${errors.departureTime
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    {...register('departureTime', {
                      required: 'Departure time is required',
                      validate: value => {
                        const selected = new Date(value);
                        const now = new Date();
                        return selected > now || 'Departure time must be in the future';
                      }
                    })}
                  />
                  {errors.departureTime && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.departureTime.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Pricing & Capacity - WITHOUT INR SYMBOL */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-indigo-100 rounded flex items-center justify-center">
                    <span className="text-[10px] font-bold text-indigo-600">Rs</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Pricing & Capacity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fare per Seat (PKR)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <span className="text-sm font-bold text-gray-400">Rs</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="500"
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all duration-200 text-sm
                          focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                          ${errors.farePerSeat
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        {...register('farePerSeat', {
                          required: 'Fare is required',
                          min: { value: 1, message: 'Minimum fare is PKR 1' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {errors.farePerSeat && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.farePerSeat.message}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Suggested: Rs 25-30 per km
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Available Seats
                    </label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="8"
                        placeholder="3"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all duration-200 text-sm
                          focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                          ${errors.seats
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        {...register('seats', {
                          required: 'Number of seats is required',
                          min: { value: 1, message: 'Minimum 1 seat' },
                          max: { value: 8, message: 'Maximum 8 seats' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {errors.seats && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.seats.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <CarFront className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Vehicle
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <select
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-200 text-sm appearance-none
                      focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                      ${errors.vehicleId
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    {...register('vehicleId', {
                      required: 'Please select a vehicle',
                      onChange: (e) => {
                        const vehicle = vehicles.find(v => v.vehicleId === parseInt(e.target.value));
                        setSelectedVehicle(vehicle);
                      }
                    })}
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.vehicleId} value={v.vehicleId}>
                        {v.make} {v.model} ({v.plateNumber}) — {v.totalSeats} seats
                      </option>
                    ))}
                  </select>

                  {errors.vehicleId && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.vehicleId.message}
                    </p>
                  )}

                  {/* Selected Vehicle Preview */}
                  {selectedVehicle && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                          <Car className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedVehicle.make} {selectedVehicle.model}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedVehicle.plateNumber} · {selectedVehicle.color} · {selectedVehicle.totalSeats} seats
                          </p>
                        </div>
                        <Check className="h-5 w-5 text-emerald-500 ml-auto" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Settings */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Booking Settings
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Approval Mode
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-all duration-200 text-sm
                      focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300"
                    {...register('requiresApproval')}
                  >
                    <option value="false">Instant Confirmation — Passengers book automatically</option>
                    <option value="true">Manual Approval — You review each request</option>
                  </select>

                  <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      With instant confirmation, passengers can book your ride immediately.
                      Manual approval gives you control over who joins your ride.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-indigo-600" />
                  <p className="text-sm font-bold text-indigo-900">Tips for a Great Ride</p>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-indigo-700">
                    <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Set a competitive fare to attract more passengers
                  </li>
                  <li className="flex items-start gap-2 text-xs text-indigo-700">
                    <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Be punctual — passengers rate drivers on timeliness
                  </li>
                  <li className="flex items-start gap-2 text-xs text-indigo-700">
                    <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Keep your vehicle clean and comfortable
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl
                    hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || vehicles.length === 0}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl
                    hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                    transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" />
                      Creating Ride...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Create Ride
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Trust Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-600">
              All rides are insured and drivers are verified
            </span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}