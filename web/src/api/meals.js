import api from './client';

// ── Ingredients ───────────────────────────────────────────────
export const getIngredients = (params) => api.get('/api/ingredient', { params });
export const getIngredientById = (id) => api.get(`/api/ingredient/${id}`);
export const getIngredientNutrition = (id) => api.get(`/api/ingredient/${id}/nutrition`);
export const getIngredientCategories = () => api.get('/api/ingredient/categories');

// ── Meals CRUD ────────────────────────────────────────────────
export const getMeals = (params) => api.get('/api/meal', { params });
export const getTodaysMeal = () => api.get('/api/meal/today');
export const getMealById = (id) => api.get(`/api/meal/${id}`);
export const createMeal = (data) => api.post('/api/meal/create', data);
export const updateMeal = (id, data) => api.put(`/api/meal/${id}`, data);
export const deleteMeal = (id) => api.delete(`/api/meal/${id}`);

// ── Ingredients on a meal ─────────────────────────────────────
export const addMealIngredients = (meal_id, ingredients) =>
  api.post(`/api/meal/${meal_id}/ingredients`, { ingredients });

// ── Distribution (auto-computed — manual trigger for debugging only) ──
export const getMealDistribution = (meal_id) => api.get(`/api/meal/${meal_id}/distribution`);
// @deprecated: distribution runs automatically after ingredient updates.
// Only call this to force a manual recompute.
export const distributeMeal = (meal_id) => api.post(`/api/meal/${meal_id}/distribute`);

// ── Nutrition summary, score, suggestions ─────────────────────
export const getMealSummary = (meal_id) => api.get(`/api/meal/${meal_id}/summary`);
export const getMealScore = (meal_id) => api.get(`/api/meal/${meal_id}/score`);
export const getMealSuggestions = (meal_id) => api.get(`/api/meal/${meal_id}/suggestions`);