import api from './api.js';

export const bookingService = {
  /**
   * Request a booking.
   *
   * data shape (all keys except rideId and seatsRequested are optional):
   * {
   *   rideId:         UUID,
   *   seatsRequested: number,
   *   pickupName:     string?,   // passenger's pickup place name
   *   pickupLat:      number?,   // pickup latitude
   *   pickupLng:      number?,   // pickup longitude
   *   dropName:       string?,   // passenger's drop place name
   *   dropLat:        number?,   // drop latitude
   *   dropLng:        number?,   // drop longitude
   *   passengerDistanceM: number?, // pickup→drop distance in metres (Directions API)
   *   clientCalculatedFare: number?, // pre-computed fare for display validation
   * }
   *
   * If pickup/drop are omitted, the backend books the full driver route
   * (backward-compatible with rides that have no stored polyline).
   */
  request: (data) =>
    api.post('/bookings', data),

  getById: (bookingId) =>
    api.get(`/bookings/${bookingId}`),

  decide: (bookingId, data) =>
    api.post(`/bookings/${bookingId}/decision`, data),

  cancel: (bookingId, reason) =>
    api.delete(`/bookings/${bookingId}`, { data: { reason } }),

  getMyBookings: ({ status, page = 0, size = 20 } = {}) =>
    api.get('/bookings/my', { params: { status, page, size } }),

  getBookingsForRide: (rideId, { page = 0, size = 20 } = {}) =>
    api.get(`/bookings/ride/${rideId}`, { params: { page, size } }),
};