import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'https://vetglobal-backend.onrender.com/api';

export const api = axios.create({ baseURL });

// Attach JWT from localStorage on every request (client-side only).
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vg_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const API_BASE = baseURL;
