import axios from 'axios';

const DEVICE_ID_KEY = 'pg_device_id';

export function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'DEV_' + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // send HTTP-only cookie on every request
  headers: { 'Content-Type': 'application/json' },
});

// Attach device fingerprint on every request so login/risk-check use the same ID
api.interceptors.request.use((config) => {
  config.headers['x-device-id'] = getOrCreateDeviceId();
  return config;
});

export default api;
