import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      // Only redirect for session-expired errors, not wrong-password etc.
      if (code === 'NO_TOKEN' || code === 'INVALID_TOKEN' || code === 'AUTH_ERROR') {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
