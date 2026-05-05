import api from './client';

// Ingredients
export const getIngredients = (params) => api.get('/api/ingredient', { params });
export const getIngredientById = (id) => api.get(`/api/ingredient/${id}`);

// Meals
export const getMeals = (params) => api.get('/api/meal', { params });
export const getMealById = (id) => api.get(`/api/meal/${id}`);
export const createMeal = (data) => api.post('/api/meal/create', data);
export const deleteMeal = (id) => api.delete(`/api/meal/${id}`);
export const addMealIngredients = (meal_id, ingredients) =>
  api.post(`/api/meal/${meal_id}/ingredients`, { ingredients });
export const distributeMeal = (meal_id) => api.post(`/api/meal/${meal_id}/distribute`);
export const getMealDistribution = (meal_id) => api.get(`/api/meal/${meal_id}/distribution`);
