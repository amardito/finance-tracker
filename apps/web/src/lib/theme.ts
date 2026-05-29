import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  init: () => void;
}

const KEY = 'ft-theme';

function apply(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
    set({ theme: next });
  },
  init: () => {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? null;
    const prefers = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme: Theme = saved ?? prefers;
    apply(theme);
    set({ theme });
  },
}));
