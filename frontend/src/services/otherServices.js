import api from './api.js';

export const notificationService = {
  getAll:       ({ page = 0, size = 20 } = {}) =>
    api.get('/notifications', { params: { page, size } }),
  getUnread:    ()               => api.get('/notifications/unread-count'),
  markOneRead:  (id)             => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()               => api.patch('/notifications/read-all'),
};

export const ratingService = {
  submit:          (data)              => api.post('/ratings', data),
  getForUser:      (userId, page = 0)  => api.get(`/ratings/user/${userId}`, { params: { page } }),
};

export const vehicleService = {
  add:    (data)      => api.post('/vehicles', data),
  getAll: ()          => api.get('/vehicles'),
  remove: (vehicleId) => api.delete(`/vehicles/${vehicleId}`),
};

export const reportService = {
  file: (data) => api.post('/reports', data),
};