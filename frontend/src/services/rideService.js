import api from './api.js';

export const rideService = {
  // Browse all available rides (no filter) — used on search page load
  browse: ({ page = 0, size = 50 } = {}) =>
    api.get('/rides/browse', { params: { page, size } }),

  search: ({ from, to, date, seats = 1, page = 0, size = 200 }) =>
    api.get('/rides/search', { params: { from, to, date, seats, page, size } }),

  getById: (rideId) =>
    api.get(`/rides/${rideId}`),

  /**
   * Create a ride.
   *
   * data shape:
   * {
   *   originName:      string,
   *   originLat:       number,
   *   originLng:       number,
   *   destName:        string,
   *   destLat:         number,
   *   destLng:         number,
   *   routePolyline:   string?,  // Google encoded polyline from Directions API
   *   routeDistanceM:  number?,  // full route distance in metres from Directions API
   *   totalTripFare:   number,   // total fare for all seats across full route
   *   departureTime:   ISO string,
   *   farePerSeat:     number,
   *   seats:           number,
   *   vehicleId:       UUID,
   *   requiresApproval: boolean,
   * }
   *
   * totalTripFare replaces farePerSeat: driver enters total for the full trip,
   * system computes per-seat fare = totalTripFare ÷ seats, then pro-rates
   * each passenger's fare based on their segment distance.
   *
   * routePolyline enables route-based booking: passengers can book from
   * any point along the route, not just origin → destination.
   * Optional but strongly recommended: rides without it fall back to
   * straight-line proximity checks for passenger pickup/drop validation.
   */
  create: (data) =>
    api.post('/rides', data),

  update: (rideId, data) =>
    api.put(`/rides/${rideId}`, data),

  deleteRide: (rideId) =>
    api.delete(`/rides/${rideId}`),

  cancel: (rideId, reason) =>
    api.delete(`/rides/${rideId}`, { data: { reason } }),

  generateOtp: (rideId) =>
    api.post(`/rides/${rideId}/otp/generate`),

  start: (rideId, otp) =>
    api.post(`/rides/${rideId}/start`, { otp }),

  complete: (rideId) =>
    api.post(`/rides/${rideId}/complete`),

  getMyRides: ({ status, page = 0, size = 20 } = {}) =>
    api.get('/rides/my', { params: { status, page, size } }),
};