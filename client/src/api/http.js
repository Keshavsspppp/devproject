import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
});

// Response interceptor: on 401, try a token refresh once, then replay.
let refreshing = null;

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing = refreshing || http.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return http(original); // replay with new cookies
      } catch (e) {
        refreshing = null;
        // redirect to login handled by store
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export const apiError = (e) => e?.response?.data?.error || e?.message || 'Something went wrong';
