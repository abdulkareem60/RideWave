import api from './api.js';

export const bookingService = {
  request: (data) =>
    api.post('/bookings', data),

  /** Alias for request — used by SearchRidesPage */
  create: (data) =>
    api.post('/bookings', data),

  getById: (bookingId) =>
    api.get(`/bookings/${bookingId}`),

  decide: (bookingId, data) =>
    api.post(`/bookings/${bookingId}/decision`, data),

  cancel: (bookingId, reason) =>
    api.delete(`/bookings/${bookingId}`, { data: { reason } }),

  getMyBookings: ({ status, page = 0, size = 20 } = {}) =>
    api.get('/bookings/my', { params: { status, page, size } }),
};