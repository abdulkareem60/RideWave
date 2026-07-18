import { useForm } from 'react-hook-form';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import Spinner from '../common/Spinner.jsx';

export default function RideSearchForm({ onSearch, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      from:  '',
      to:    '',
      date:  format(new Date(), 'yyyy-MM-dd'),
      seats: 1,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSearch)}
          className="card p-5 shadow-md">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Search Available Rides</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* From */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">From</label>
          <input className={`input ${errors.from ? 'input-error' : ''}`}
                 placeholder="Karachi, DHA Phase 5…"
                 {...register('from', { required: 'Origin is required' })} />
          {errors.from && <p className="text-xs text-red-500">{errors.from.message}</p>}
        </div>

        {/* To */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">To</label>
          <input className={`input ${errors.to ? 'input-error' : ''}`}
                 placeholder="Lahore, Gulberg…"
                 {...register('to', { required: 'Destination is required' })} />
          {errors.to && <p className="text-xs text-red-500">{errors.to.message}</p>}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Date</label>
          <input type="date" className={`input ${errors.date ? 'input-error' : ''}`}
                 {...register('date', { required: 'Date is required' })} />
          {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
        </div>

        {/* Seats */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Seats</label>
          <input type="number" min={1} max={8} className="input"
                 {...register('seats', { min: 1, max: 8, valueAsNumber: true })} />
        </div>
      </div>

      <button type="submit" disabled={loading}
              className="btn-primary mt-4 w-full sm:w-auto sm:px-8">
        {loading ? <Spinner size="sm" /> : <><Search className="h-4 w-4" /> Search Rides</>}
      </button>
    </form>
  );
}