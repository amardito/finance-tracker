import { create } from 'zustand';
import { api } from './api';

export interface AuthUser {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  hasToken?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  load: () => Promise<void>;
  loginWithToken: (token: string) => Promise<AuthUser>;
  generateToken: (name?: string) => Promise<{ token: string; user: AuthUser }>;
  rotateToken: () => Promise<string>;
  updateProfile: (data: { name?: string; currency?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  load: async () => {
    try {
      await api.csrfBootstrap();
      const user = await api.get<AuthUser>('/api/auth/me');
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  loginWithToken: async (token) => {
    const user = await api.post<AuthUser>('/api/auth/token/login', { token });
    set({ user });
    return user;
  },
  generateToken: async (name) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/api/auth/token/new', { name });
    set({ user: res.user });
    return res;
  },
  rotateToken: async () => {
    const res = await api.post<{ token: string }>('/api/auth/token/rotate');
    return res.token;
  },
  updateProfile: async (data) => {
    const user = await api.patch<AuthUser>('/api/auth/me', data);
    set({ user });
    return user;
  },
  logout: async () => {
    await api.post('/api/auth/logout');
    set({ user: null });
  },
}));

// LocalStorage helpers for saved tokens (web3-like wallet list)
export interface SavedToken {
  label: string;
  token: string; // raw token (held only in browser)
  addedAt: string;
}

const STORAGE_KEY = 'ft_saved_tokens_v1';

export function loadSavedTokens(): SavedToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((t) => t && typeof t.token === 'string');
  } catch {
    return [];
  }
}

export function saveTokens(list: SavedToken[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addSavedToken(token: string, label?: string): SavedToken[] {
  const list = loadSavedTokens();
  if (list.some((t) => t.token === token)) return list;
  const entry: SavedToken = {
    token,
    label: label || `Token ${list.length + 1}`,
    addedAt: new Date().toISOString(),
  };
  const next = [...list, entry];
  saveTokens(next);
  return next;
}

export function removeSavedToken(token: string): SavedToken[] {
  const next = loadSavedTokens().filter((t) => t.token !== token);
  saveTokens(next);
  return next;
}

export function renameSavedToken(token: string, label: string): SavedToken[] {
  const next = loadSavedTokens().map((t) => (t.token === token ? { ...t, label } : t));
  saveTokens(next);
  return next;
}

export function maskToken(token: string): string {
  if (token.length < 12) return '••••';
  return token.slice(0, 6) + '…' + token.slice(-4);
}
