import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Types
export interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  dataAmount: string;
  validityDays: number;
  price: string;
  originalPrice: string | null;
  currency: string;
  stock: number;
  status: string;
  imageUrl: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API calls
export const productsApi = {
  list: () => api.get<PaginatedResponse<Product>>('/products'),
  get: (id: string) => api.get<Product>(`/products/${id}`),
};

export const ordersApi = {
  create: (data: { items: { productId: string; quantity: number }[]; contactEmail?: string }) =>
    api.post('/orders', data),
  get: (orderNo: string) => api.get(`/orders/${orderNo}`),
};

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; nickname?: string }) =>
    api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
};
