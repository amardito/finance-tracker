import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'CHECKING' | 'SAVINGS' | 'CREDIT';
  openingBalance: string;
  balance: string;
  currency: string;
  archivedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  icon?: string;
  parentId: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  note?: string;
  category: { id: string; name: string; color: string; type: string };
  account: { id: string; name: string; type: string };
  tags: Tag[];
}

export interface BudgetProgress {
  id: string;
  categoryId: string;
  category: Category;
  period: 'WEEKLY' | 'MONTHLY';
  amount: string;
  spent: string;
  remaining: string;
  ratio: number;
  periodStart: string;
  periodEnd: string;
  status: 'OK' | 'WARN' | 'OVER';
}

export interface RecurringRule {
  id: string;
  accountId: string;
  categoryId: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  note?: string;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  pausedAt: string | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  accountId: string | null;
  status: 'ACTIVE' | 'DONE' | 'ARCHIVED';
  contributions: { id: string; amount: string; date: string; note?: string }[];
}

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: () => api.get<Account[]>('/api/accounts') });
}
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/categories'),
  });
}
export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: () => api.get<Tag[]>('/api/tags') });
}

export function useTransactions(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  return useQuery({
    queryKey: ['transactions', qs.toString()],
    queryFn: () =>
      api.get<{ total: number; page: number; limit: number; items: Transaction[] }>(
        `/api/transactions?${qs.toString()}`,
      ),
  });
}

export function useBudgetProgress() {
  return useQuery({
    queryKey: ['budgets', 'progress'],
    queryFn: () => api.get<BudgetProgress[]>('/api/budgets/progress'),
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: ['recurring'],
    queryFn: () => api.get<RecurringRule[]>('/api/recurring'),
  });
}

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => api.get<Goal[]>('/api/goals') });
}

export function useSummary(range: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (range.from) qs.set('from', range.from);
  if (range.to) qs.set('to', range.to);
  return useQuery({
    queryKey: ['reports', 'summary', qs.toString()],
    queryFn: () =>
      api.get<{
        from: string;
        to: string;
        income: string;
        expense: string;
        net: string;
        netWorth: string;
        transactionCount: number;
      }>(`/api/reports/summary?${qs.toString()}`),
  });
}

export function useCashflow(range: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (range.from) qs.set('from', range.from);
  if (range.to) qs.set('to', range.to);
  return useQuery({
    queryKey: ['reports', 'cashflow', qs.toString()],
    queryFn: () =>
      api.get<{ date: string; income: string; expense: string; net: string }[]>(
        `/api/reports/cashflow?${qs.toString()}`,
      ),
  });
}

export function useByCategory(range: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (range.from) qs.set('from', range.from);
  if (range.to) qs.set('to', range.to);
  return useQuery({
    queryKey: ['reports', 'by-category', qs.toString()],
    queryFn: () =>
      api.get<
        { categoryId: string; category: Category | null; type: string; amount: string }[]
      >(`/api/reports/by-category?${qs.toString()}`),
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
