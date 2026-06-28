import api from './client';

export const getInventory = () => api.get('/api/inventory');
export const updateInventory = (items) => api.post('/api/inventory', { items });
export const deleteInventoryItem = (ingredient_id) => api.delete(`/api/inventory/${ingredient_id}`);