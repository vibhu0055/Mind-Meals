import api from './client';

export const getTeachers = () => api.get('/api/teacher/');
export const createTeacher = (data) => api.post('/api/teacher/create', data);
export const deleteTeacher = (id) => api.delete(`/api/teacher/${id}`);
export const updateMealPermission = (id, can_manage_meals) =>
  api.patch(`/api/teacher/${id}/meal-permission`, { can_manage_meals });
export const getTeacherProfile = () => api.get('/api/teacher/me');