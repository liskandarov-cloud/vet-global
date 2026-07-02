'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  vetPointsBalance: number;
  isVerified?: boolean;
  company?: string | null;
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  ready: false,
  setSession: (token, user) => {
    if (typeof window !== 'undefined') localStorage.setItem('vg_token', token);
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('vg_token');
    set({ token: null, user: null });
  },
  refresh: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('vg_token');
    if (!token) {
      set({ ready: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ token, user: data, ready: true });
    } catch {
      localStorage.removeItem('vg_token');
      set({ token: null, user: null, ready: true });
    }
  },
}));

// ── Cart ──
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  minOrder: number;
  image?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          const addQty = qty ?? item.minOrder ?? 1;
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + addQty } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: addQty }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'vg_cart' },
  ),
);
