import api from './client';

export const loginUser = (data) => api.post('/api/auth/login', data);
export const registerSchool = (data) => api.post('/api/school/register', data);
