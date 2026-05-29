import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccounts, useCategories, useRecurring } from '../lib/queries';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';
import { MoneyInput } from '../components/MoneyInput';

interface Form {
  accountId: string;
  categoryId: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  note: string;
  startDate: string;
}

export function RecurringPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const accounts = useAccounts();
  const categories = useCategories();
  const rules = useRecurring();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({
    accountId: '',
    categoryId: '',
    amount: '',
    type: 'EXPENSE',
    cadence: 'MONTHLY',
    interval: 1,
    note: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/recurring', form),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['recurring'] });
      const previous = qc.getQueryData<typeof rules.data>(['recurring']);
      const optimistic = {
        id: `tmp-${Date.now()}`,
        accountId: form.accountId,
        categoryId: form.categoryId,
        amount: form.amount,
        type: form.type,
        cadence: form.cadence,
        interval: form.interval,
        note: form.note || undefined,
        startDate: form.startDate,
        endDate: null,
        nextRunAt: new Date(form.startDate).toISOString(),
        lastRunAt: null,
        pausedAt: null,
      };
      qc.setQueryData(['recurring'], (old: typeof rules.data) => [optimistic, ...(old ?? [])]);
      setOpen(false);
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Recurring rule created');
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(['recurring'], ctx?.previous);
      toast.error(e.message);
    },
  });

  const togglePause = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      api.patch(`/api/recurring/${id}`, { paused }),
    onMutate: async ({ id, paused }) => {
      await qc.cancelQueries({ queryKey: ['recurring'] });
      const previous = qc.getQueryData<typeof rules.data>(['recurring']);
      qc.setQueryData(['recurring'], (old: typeof rules.data) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, pausedAt: paused ? new Date().toISOString() : null } : r)),
      );
      return { previous };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(['recurring'], ctx?.previous);
      toast.error(e.message);
    },
  });

  const runNow = useMutation({
    mutationFn: (id: string) => api.post(`/api/recurring/${id}/run`),
    onSuccess: (res: unknown) => {
      const r = res as { created: number };
      toast.success(`Created ${r.created} transactions`);
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/recurring/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['recurring'] });
      const previous = qc.getQueryData<typeof rules.data>(['recurring']);
      qc.setQueryData(['recurring'], (old: typeof rules.data) => (old ?? []).filter((r) => r.id !== id));
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Deleted');
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(['recurring'], ctx?.previous);
      toast.error(e.message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Recurring</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + New rule
        </button>
      </div>
      {rules.isFetching && <p className="text-xs text-muted inline-flex items-center gap-2"><span className="spinner" />Refreshing recurring rules...</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Cadence</th>
              <th className="p-3">Next run</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rules.isPending && !rules.data &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border">
                  <td className="p-3"><div className="skeleton h-4 w-16" /></td>
                  <td className="p-3"><div className="skeleton h-4 w-24" /></td>
                  <td className="p-3"><div className="skeleton h-4 w-28" /></td>
                  <td className="p-3"><div className="skeleton h-4 w-24" /></td>
                  <td className="p-3"><div className="skeleton h-5 w-16" /></td>
                  <td className="p-3" />
                </tr>
              ))}
            {(rules.data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="p-3">{r.type}</td>
                <td className="p-3">{money(r.amount, currency)}</td>
                <td className="p-3">
                  Every {r.interval} {r.cadence.toLowerCase()}
                </td>
                <td className="p-3">{format(new Date(r.nextRunAt), 'MMM d, yyyy')}</td>
                <td className="p-3">
                  {r.pausedAt ? (
                    <span className="badge bg-warn/20 text-warn">Paused</span>
                  ) : (
                    <span className="badge bg-success/20 text-success">Active</span>
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => runNow.mutate(r.id)} className="text-primary">
                    {runNow.isPending && runNow.variables === r.id ? 'Running...' : 'Run'}
                  </button>
                  <button
                    disabled={togglePause.isPending && togglePause.variables?.id === r.id}
                    onClick={() => togglePause.mutate({ id: r.id, paused: !r.pausedAt })}
                    className="text-muted hover:text-fg"
                  >
                    {togglePause.isPending && togglePause.variables?.id === r.id
                      ? 'Updating...'
                      : r.pausedAt
                        ? 'Resume'
                        : 'Pause'}
                  </button>
                  <button
                    disabled={remove.isPending && remove.variables === r.id}
                    onClick={() => {
                      if (confirm('Delete rule?')) remove.mutate(r.id);
                    }}
                    className="text-muted hover:text-danger"
                  >
                    {remove.isPending && remove.variables === r.id ? '...' : '✕'}
                  </button>
                </td>
              </tr>
            ))}
            {rules.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No recurring rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New recurring rule</h2>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={form.type === 'EXPENSE' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setForm({ ...form, type: 'EXPENSE', categoryId: '' })}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={form.type === 'INCOME' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setForm({ ...form, type: 'INCOME', categoryId: '' })}
                >
                  Income
                </button>
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
                <label className="label">Account</label>
                <select
                  required
                  className="input"
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {(accounts.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  required
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {(categories.data ?? [])
                    .filter((c) => c.type === form.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Every</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="input"
                    value={form.interval}
                    onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Cadence</label>
                  <select
                    className="input"
                    value={form.cadence}
                    onChange={(e) =>
                      setForm({ ...form, cadence: e.target.value as Form['cadence'] })
                    }
                  >
                    <option value="DAILY">Days</option>
                    <option value="WEEKLY">Weeks</option>
                    <option value="MONTHLY">Months</option>
                    <option value="YEARLY">Years</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Start date (first occurrence)</label>
                <input
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Note</label>
                <input
                  className="input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
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
