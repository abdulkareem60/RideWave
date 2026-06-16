import { useState, useRef } from 'react';
import { X, Car, Loader2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehicleService } from '../../services/otherServices.js';
import { validateImageFile, fileToBase64 } from '../../services/documentService.js';
import VehicleThumbnail from '../common/VehicleThumbnail.jsx';

/**
 * AddVehicleModal — reusable modal for registering a new vehicle,
 * including an optional vehicle photo (JPG/PNG, max 5MB).
 *
 * Props:
 *   isOpen    — controls visibility
 *   onClose   — called when the modal should close (cancel or after success)
 *   onCreated — called with the newly-created VehicleResponse on success
 */
export default function AddVehicleModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear(),
    plateNumber: '', color: '', totalSeats: 4,
  });
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64]   = useState(null);
  const photoInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: ['year', 'totalSeats'].includes(name) ? value.replace(/[^0-9]/g, '') : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast.error(err); e.target.value = ''; return; }
    const base64 = await fileToBase64(file);
    setPhotoPreview(base64);
    setPhotoBase64(base64);
  };

  const validate = () => {
    const e = {};
    if (!form.make.trim())  e.make  = 'Make is required';
    if (!form.model.trim()) e.model = 'Model is required';
    if (!form.plateNumber.trim()) e.plateNumber = 'Plate number is required';

    const year = parseInt(form.year, 10);
    if (!year || year < 1980 || year > 2030) e.year = 'Year must be between 1980 and 2030';

    const seats = parseInt(form.totalSeats, 10);
    if (!seats || seats < 1 || seats > 8) e.totalSeats = 'Seats must be between 1 and 8';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ make: '', model: '', year: new Date().getFullYear(), plateNumber: '', color: '', totalSeats: 4 });
    setPhotoPreview(null);
    setPhotoBase64(null);
    setErrors({});
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const { data: res } = await vehicleService.add({
        make:        form.make.trim(),
        model:       form.model.trim(),
        year:        parseInt(form.year, 10),
        plateNumber: form.plateNumber.trim().toUpperCase(),
        color:       form.color.trim(),
        totalSeats:  parseInt(form.totalSeats, 10),
        imageUrl:    photoBase64 || undefined,
      });

      toast.success('Vehicle added successfully!');
      onCreated?.(res.data);
      onClose();
      resetForm();
    } catch (error) {
      const data = error.response?.data;
      if (data?.fieldErrors) {
        setErrors(data.fieldErrors);
      } else {
        toast.error(data?.message || 'Failed to add vehicle. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Add Vehicle</h2>
          </div>
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Photo picker */}
          <div className="flex items-center gap-3">
            <VehicleThumbnail src={photoPreview} size="md" />
            <div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" /> {photoPreview ? 'Change Photo' : 'Add Vehicle Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG/PNG, max 5MB. Optional.</p>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Make</label>
              <input
                type="text" name="make" value={form.make} onChange={handleChange}
                placeholder="Toyota"
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all ${
                  errors.make ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {errors.make && <p className="mt-1 text-xs text-red-500">{errors.make}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
              <input
                type="text" name="model" value={form.model} onChange={handleChange}
                placeholder="Corolla"
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all ${
                  errors.model ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {errors.model && <p className="mt-1 text-xs text-red-500">{errors.model}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
              <input
                type="text" inputMode="numeric" name="year" value={form.year} onChange={handleChange}
                placeholder="2020" maxLength={4}
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all ${
                  errors.year ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {errors.year && <p className="mt-1 text-xs text-red-500">{errors.year}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
              <input
                type="text" name="color" value={form.color} onChange={handleChange}
                placeholder="White"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Plate Number</label>
            <input
              type="text" name="plateNumber" value={form.plateNumber} onChange={handleChange}
              placeholder="ABC-1234"
              className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all uppercase ${
                errors.plateNumber ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            {errors.plateNumber && <p className="mt-1 text-xs text-red-500">{errors.plateNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Seats</label>
            <select
              name="totalSeats" value={form.totalSeats} onChange={handleChange}
              className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all ${
                errors.totalSeats ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
              }`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
              ))}
            </select>
            {errors.totalSeats && <p className="mt-1 text-xs text-red-500">{errors.totalSeats}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { onClose(); resetForm(); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>) : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}