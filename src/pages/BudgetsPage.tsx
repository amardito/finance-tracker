import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useBudgetProgress, useCategories } from '../lib/queries';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { MoneyInput } from '../components/MoneyInput';

export function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const categories = useCategories();
  const progress = useBudgetProgress();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    period: 'MONTHLY' as 'MONTHLY' | 'WEEKLY',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/budgets', form),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['budgets', 'progress'] });
      const previous = qc.getQueryData<typeof progress.data>(['budgets', 'progress']);
      const cat = expenseCats.find((c) => c.id === form.categoryId);
      if (cat) {
        qc.setQueryData(['budgets', 'progress'], (old: typeof progress.data) => {
          const items = old ?? [];
          const optimistic = {
            id: `tmp-${Date.now()}`,
            categoryId: form.categoryId,
            category: cat,
            period: form.period,
            amount: form.amount,
            spent: '0',
            remaining: form.amount,
            ratio: 0,
            periodStart: form.startDate,
            periodEnd: form.startDate,
            status: 'OK' as const,
          };
          return [optimistic, ...items];
        });
      }
      setOpen(false);
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget created');
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(['budgets', 'progress'], ctx?.previous);
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/budgets/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['budgets', 'progress'] });
      const previous = qc.getQueryData<typeof progress.data>(['budgets', 'progress']);
      qc.setQueryData(['budgets', 'progress'], (old: typeof progress.data) =>
        (old ?? []).filter((b) => b.id !== id),
      );
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Deleted');
    },
    onError: (e: Error, _id, ctx) => {
      qc.setQueryData(['budgets', 'progress'], ctx?.previous);
      toast.error(e.message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  const expenseCats = (categories.data ?? []).filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + New budget
        </button>
      </div>
      {progress.isFetching && <p className="text-xs text-muted inline-flex items-center gap-2"><span className="spinner" />Refreshing budgets...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {progress.isPending && !progress.data &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="card space-y-3">
              <div className="skeleton h-5 w-28" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        {(progress.data ?? []).map((b) => (
          <div key={b.id} className="card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">{b.category.name}</div>
                <div className="text-xs text-muted">{b.period}</div>
              </div>
              <button
                disabled={remove.isPending && remove.variables === b.id}
                onClick={() => remove.mutate(b.id)}
                className="text-muted hover:text-danger disabled:opacity-50"
              >
                {remove.isPending && remove.variables === b.id ? '...' : '✕'}
              </button>
            </div>
            <div className="text-sm mb-1 flex justify-between">
              <span>
                {money(b.spent, currency)} / {money(b.amount, currency)}
              </span>
              <span
                className={
                  b.status === 'OVER'
                    ? 'text-danger'
                    : b.status === 'WARN'
                      ? 'text-warn'
                      : 'text-success'
                }
              >
                {Math.round(b.ratio * 100)}%
              </span>
            </div>
            <div className="h-2 bg-border rounded">
              <div
                className={
                  'h-2 rounded ' +
                  (b.status === 'OVER'
                    ? 'bg-danger'
                    : b.status === 'WARN'
                      ? 'bg-warn'
                      : 'bg-success')
                }
                style={{ width: `${Math.min(100, Math.round(b.ratio * 100))}%` }}
              />
            </div>
            <div className="text-xs text-muted mt-2">
              Remaining: {money(b.remaining, currency)}
            </div>
          </div>
        ))}
        {(progress.data?.length ?? 0) === 0 && (
          <div className="card text-muted text-center col-span-full">
            No budgets yet.
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New budget</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">Category</label>
                <select
                  required
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {expenseCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <MoneyInput
                  required
                  className="input"
                  currency={currency}
                  value={form.amount}
                  onChange={(v) => setForm({ ...form, amount: v })}
                />
              </div>
              <div>
                <label className="label">Period</label>
                <select
                  className="input"
                  value={form.period}
                  onChange={(e) =>
                    setForm({ ...form, period: e.target.value as 'MONTHLY' | 'WEEKLY' })
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              <div>
                <label className="label">Start date</label>
                <input
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={create.isPending}>
                  {create.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
