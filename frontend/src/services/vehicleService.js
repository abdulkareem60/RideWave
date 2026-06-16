import api from './api.js';

export const vehicleService = {
  /** Get all vehicles belonging to the current driver */
  getMyVehicles: () => api.get('/vehicles'),

  /** Add a new vehicle */
  create: (data) => api.post('/vehicles', data),

  /** Update a vehicle */
  update: (vehicleId, data) => api.put(`/vehicles/${vehicleId}`, data),

  /** Delete a vehicle */
  delete: (vehicleId) => api.delete(`/vehicles/${vehicleId}`),
};