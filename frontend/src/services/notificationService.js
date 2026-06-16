import api from './api.js';

export const notificationService = {
  getAll:       (page = 0, size = 20) =>
    api.get('/notifications', { params: { page, size } }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markOneRead:  (notificationId) =>
    api.patch(`/notifications/${notificationId}/read`),

  markAllRead:  () =>
    api.patch('/notifications/read-all'),
};