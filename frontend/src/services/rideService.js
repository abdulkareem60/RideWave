import api from './api.js';

export const rideService = {
  search: ({ from, to, date, seats = 1, page = 0, size = 20 }) =>
    api.get('/rides/search', { params: { from, to, date, seats, page, size } }),

  getById: (rideId) =>
    api.get(`/rides/${rideId}`),

  create: (data) =>
    api.post('/rides', data),

  update: (rideId, data) =>
    api.put(`/rides/${rideId}`, data),

  cancel: (rideId, reason) =>
    api.delete(`/rides/${rideId}`, { data: { reason } }),


  start: (rideId) =>
    api.post(`/rides/${rideId}/start`),

  checkIn: (rideId, passengerLat, passengerLng) =>
    api.post(`/rides/${rideId}/checkin`, { passengerLat, passengerLng }),

  complete: (rideId) =>
    api.post(`/rides/${rideId}/complete`),

  getMyRides: ({ status, page = 0, size = 20 } = {}) =>
    api.get('/rides/my', { params: { status, page, size } }),

  getBookingsForRide: (rideId, { page = 0, size = 20 } = {}) =>
    api.get(`/bookings/ride/${rideId}`, { params: { page, size } }),
};