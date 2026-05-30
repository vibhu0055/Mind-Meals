import api from './client';

export const getStudents = (params = {}) => api.get('/api/student/', { params });
export const getStudentsByClass = (class_id, params = {}) => api.get(`/api/student/class/${class_id}`, { params });
export const getStudentById = (id) => api.get(`/api/student/${id}`);
export const addStudent = (data) => api.post('/api/student/add', data);
export const updateStudent = (id, data) => api.patch(`/api/student/${id}`, data);
export const deleteStudent = (id) => api.delete(`/api/student/${id}`);
export const notifyParent = (id) => api.post(`/api/student/${id}/notify`);