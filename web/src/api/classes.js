import api from './client';

export const getClasses = () => api.get('/api/class/');
export const createClass = (data) => api.post('/api/class/create', data);
export const updateClass = (id, data) => api.patch(`/api/class/${id}`, data);
export const deleteClass = (id) => api.delete(`/api/class/${id}`);
export const assignTeacherToClass = (data) => api.post('/api/class/assign-teacher', data);