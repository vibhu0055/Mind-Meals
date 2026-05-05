import api from './client';

export const getRDAReference = () => api.get('/api/nutrition/rda');
export const generateReport = (student_id, meal_id) =>
  api.post(`/api/nutrition/report/${student_id}/${meal_id}`);
export const generateClassReport = (class_id, meal_id) =>
  api.post(`/api/nutrition/report/class/${class_id}/${meal_id}`);
export const getReport = (student_id, meal_id) =>
  api.get(`/api/nutrition/report/${student_id}/${meal_id}`);
export const getStudentReports = (student_id) =>
  api.get(`/api/nutrition/reports/student/${student_id}`);
export const getClassReports = (class_id, meal_id) =>
  api.get(`/api/nutrition/reports/class/${class_id}/${meal_id}`);
export const getSchoolReports = (params) =>
  api.get('/api/nutrition/reports/school', { params });
