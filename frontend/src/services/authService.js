import api from './api.js';

export const authService = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  verifyEmail:    (data) => api.post('/auth/verify-email', data),
  verifyPhone:    (data) => api.post('/auth/verify-phone', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  refresh:        (data) => api.post('/auth/refresh', data),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
};