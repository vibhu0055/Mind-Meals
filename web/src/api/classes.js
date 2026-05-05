import api from './client';

export const getClasses = () => api.get('/api/class');
export const createClass = (data) => api.post('/api/class/create', data);
export const updateClass = (id, data) => api.patch(`/api/class/${id}`, data);
export const deleteClass = (id) => api.delete(`/api/class/${id}`);
export const assignTeacherToClass = (data) => api.post('/api/class/assign-teacher', data);

export const getClassGroups = () => api.get('/api/class-group');
export const getGroupConfig = () => api.get('/api/class-group/config');
export const assignClassToGroup = (data) => api.post('/api/class-group/assign', data);
