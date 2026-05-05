import api from './client';

export const getStudents = () => api.get('/api/student');
export const getStudentsByClass = (class_id) => api.get(`/api/student/class/${class_id}`);
export const getStudentById = (id) => api.get(`/api/student/${id}`);
export const addStudent = (data) => api.post('/api/student/add', data);
export const updateStudent = (id, data) => api.patch(`/api/student/${id}`, data);
export const deleteStudent = (id) => api.delete(`/api/student/${id}`);
