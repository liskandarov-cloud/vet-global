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

// ── Favorites ──
interface FavState {
  ids: string[];
  load: () => Promise<void>;
  has: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
  clear: () => void;
}

export const useFavorites = create<FavState>((set, get) => ({
  ids: [],
  load: async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('vg_token')) return;
    try {
      const { data } = await api.get('/favorites/ids');
      set({ ids: data });
    } catch {
      /* ignore */
    }
  },
  has: (id) => get().ids.includes(id),
  toggle: async (id) => {
    const have = get().ids.includes(id);
    set({ ids: have ? get().ids.filter((x) => x !== id) : [...get().ids, id] });
    try {
      if (have) await api.delete(`/favorites/${id}`);
      else await api.post('/favorites', { productId: id });
    } catch {
      // revert on failure
      set({ ids: have ? [...get().ids, id] : get().ids.filter((x) => x !== id) });
    }
  },
  clear: () => set({ ids: [] }),
}));

// ── Cart ──
export interface CartItem {
  productId: string;
  offerId?: string; // выбранный оффер продавца (мульти-поставщик)
  sellerName?: string;
  name: string;
  price: number;
  minOrder: number;
  image?: string;
  quantity: number;
}

// Идентичность позиции: оффер (если выбран) либо товар.
export const cartKey = (i: { productId: string; offerId?: string }) => i.offerId ?? i.productId;

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
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
          const key = cartKey(item);
          const existing = s.items.find((i) => cartKey(i) === key);
          const addQty = qty ?? item.minOrder ?? 1;
          if (existing) {
            return {
              items: s.items.map((i) =>
                cartKey(i) === key ? { ...i, quantity: i.quantity + addQty } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: addQty }] };
        }),
      // Кламп к минимальному заказу: иначе сервер отобьёт оформление в самом конце.
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            cartKey(i) === key ? { ...i, quantity: Math.max(i.minOrder || 1, qty) } : i,
          ),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => cartKey(i) !== key) })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'vg_cart' },
  ),
);
