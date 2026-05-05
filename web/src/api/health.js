import api from './client';

export const addHealthRecord = (data) => api.post('/api/health', data);
export const getHealthRecordsByStudent = (student_id) => api.get(`/api/health/student/${student_id}`);
export const getHealthRecordById = (id) => api.get(`/api/health/${id}`);
export const getLatestHealthRecord = (student_id) => api.get(`/api/health/latest/${student_id}`);
export const updateHealthRecord = (id, data) => api.patch(`/api/health/${id}`, data);
export const deleteHealthRecord = (id) => api.delete(`/api/health/${id}`);
