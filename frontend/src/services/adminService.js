import api from './api.js';

export const adminService = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  listUsers: ({ role, status, search, page = 0, size = 20 } = {}) =>
    api.get('/admin/users', { params: { role, status, search, page, size } }),

  getUserById: (userId) =>
    api.get(`/admin/users/${userId}`),

  updateUserStatus: (userId, data) =>
    api.patch(`/admin/users/${userId}/status`, data),

  getPendingDrivers: ({ page = 0, size = 20 } = {}) =>
    api.get('/admin/drivers/pending', { params: { page, size } }),

  verifyDriver: (driverId, data) =>
    api.post(`/admin/drivers/${driverId}/verify`, data),

  checkVerificationEligibility: (driverId) =>
    api.get(`/admin/drivers/${driverId}/verification-eligibility`),

  requestReupload: (driverId, docType, reason) =>
    api.post(`/admin/drivers/${driverId}/request-reupload`, null, { params: { docType, reason } }),

  getReports: ({ status, page = 0, size = 20 } = {}) =>
    api.get('/admin/reports', { params: { status, page, size } }),

  resolveReport: (reportId, data) =>
    api.post(`/admin/reports/${reportId}/resolve`, data),
};