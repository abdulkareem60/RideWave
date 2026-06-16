import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CreditCard, Banknote, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner.jsx';
import { bookingService } from '../../services/bookingService.js';
import { formatCurrency } from '../../utils/formatters.js';

const PAYMENT_METHODS = [
  { value: 'CASH',      label: 'Cash on Pickup',  icon: Banknote },
  { value: 'CARD',      label: 'Debit/Credit Card', icon: CreditCard },
  { value: 'EASYPAISA', label: 'EasyPaisa',         icon: Smartphone },
  { value: 'JAZZCASH',  label: 'JazzCash',           icon: Smartphone },
];

export default function BookingModal({ ride, onClose }) {
  const navigate = useNavigate();
  const [seats,         setSeats]         = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading,       setLoading]       = useState(false);

  const totalFare = Number(ride.farePerSeat) * seats;

  const handleBook = async () => {
    setLoading(true);
    try {
      const { data: res } = await bookingService.request({
        rideId: ride.rideId,
        seats,
        paymentMethod,
      });
      toast.success(res.message ?? 'Booking confirmed!');
      onClose();
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Book Ride</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Route summary */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-900">{ride.originName}</p>
            <p className="text-gray-400 text-xs my-0.5">→</p>
            <p className="font-medium text-gray-900">{ride.destName}</p>
          </div>

          {/* Seat selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Seats ({ride.availableSeats} available)
            </label>
            <div className="flex items-center gap-3">
              <button className="btn-secondary h-9 w-9 p-0 text-lg font-bold"
                      disabled={seats <= 1}
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}>−</button>
              <span className="text-lg font-semibold w-6 text-center">{seats}</span>
              <button className="btn-secondary h-9 w-9 p-0 text-lg font-bold"
                      disabled={seats >= ride.availableSeats}
                      onClick={() => setSeats((s) => Math.min(ride.availableSeats, s + 1))}>+</button>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors
                          ${paymentMethod === value
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fare summary */}
          <div className="p-3 bg-brand-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-600">Total ({seats} seat{seats !== 1 ? 's' : ''})</span>
            <span className="text-lg font-bold text-brand-700">{formatCurrency(totalFare)}</span>
          </div>

          {ride.requiresApproval && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              ⚠️ The driver will review your request before confirming.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary flex-1 py-3" onClick={handleBook} disabled={loading}>
            {loading ? <Spinner size="sm" /> : `Confirm Booking`}
          </button>
        </div>
      </div>
    </div>
  );
}