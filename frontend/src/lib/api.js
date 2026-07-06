import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Token qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hotel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xato boshqarish
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hotel_token');
      localStorage.removeItem('hotel_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
