import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Transaction,
  useAccounts,
  useCategories,
  useTags,
  useTransactions,
} from '../lib/queries';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { MoneyInput } from '../components/MoneyInput';

interface FormState {
  id?: string;
  type: 'INCOME' | 'EXPENSE';
  accountId: string;
  categoryId: string;
  amount: string;
  date: string;
  note: string;
  tagIds: string[];
}

const blank = (): FormState => ({
  type: 'EXPENSE',
  accountId: '',
  categoryId: '',
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  note: '',
  tagIds: [],
});

export function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const [filters, setFilters] = useState<{
    type?: string;
    accountId?: string;
    categoryId?: string;
    q?: string;
    from?: string;
    to?: string;
    page: number;
  }>({ page: 1 });
  const [drawer, setDrawer] = useState<FormState | null>(null);

  const accounts = useAccounts();
  const categories = useCategories();
  const tags = useTags();
  const list = useTransactions({ ...filters, limit: 50 });
  const qc = useQueryClient();

  const filteredCategories = useMemo(
    () => (categories.data ?? []).filter((c) => !drawer || c.type === drawer.type),
    [categories.data, drawer],
  );

  const createOrUpdate = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        type: f.type,
        accountId: f.accountId,
        categoryId: f.categoryId,
        amount: f.amount,
        date: f.date,
        note: f.note || undefined,
        tagIds: f.tagIds,
      };
      if (f.id) return api.patch(`/api/transactions/${f.id}`, payload);
      return api.post('/api/transactions', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Saved');
      setDrawer(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Deleted');
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!drawer) return;
    if (!drawer.accountId || !drawer.categoryId) {
      toast.error('Account and category required');
      return;
    }
    createOrUpdate.mutate(drawer);
  };

  const openNew = () => {
    const f = blank();
    f.accountId = accounts.data?.[0]?.id ?? '';
    f.categoryId = categories.data?.find((c) => c.type === 'EXPENSE')?.id ?? '';
    setDrawer(f);
  };

  const openEdit = (t: Transaction) => {
    setDrawer({
      id: t.id,
      type: t.type,
      accountId: t.accountId,
      categoryId: t.categoryId,
      amount: t.amount,
      date: format(new Date(t.date), 'yyyy-MM-dd'),
      note: t.note ?? '',
      tagIds: t.tags.map((tg) => tg.id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <div className="flex gap-2">
          <Link to="/transactions/import" className="btn-secondary">
            Import CSV
          </Link>
          <button onClick={openNew} className="btn-primary">
            + New
          </button>
        </div>
      </div>

      <div className="card grid grid-cols-2 md:grid-cols-6 gap-2">
        <select
          className="input"
          value={filters.type ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <select
          className="input"
          value={filters.accountId ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, accountId: e.target.value || undefined, page: 1 }))
          }
        >
          <option value="">All accounts</option>
          {(accounts.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.categoryId ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))
          }
        >
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          value={filters.from?.slice(0, 10) ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
        />
        <input
          type="date"
          className="input"
          value={filters.to?.slice(0, 10) ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
        />
        <input
          placeholder="Search notes…"
          className="input"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Category</th>
              <th className="p-3">Account</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(list.data?.items ?? []).map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-bg">
                <td className="p-3">{format(new Date(t.date), 'MMM d, yyyy')}</td>
                <td className="p-3">
                  <button onClick={() => openEdit(t)} className="hover:text-primary text-left">
                    {t.note || <span className="text-muted">(no note)</span>}
                  </button>
                  {t.tags.length > 0 && (
                    <span className="ml-2 inline-flex gap-1">
                      {t.tags.map((tg) => (
                        <span
                          key={tg.id}
                          className="badge"
                          style={{ backgroundColor: tg.color + '33', color: tg.color }}
                        >
                          {tg.name}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.category.color }}
                    />
                    {t.category.name}
                  </span>
                </td>
                <td className="p-3">{t.account.name}</td>
                <td
                  className={
                    'p-3 text-right font-medium ' +
                    (t.type === 'INCOME' ? 'text-success' : 'text-danger')
                  }
                >
                  {t.type === 'INCOME' ? '+' : '-'}
                  {money(t.amount, currency)}
                </td>
                <td className="p-3 text-right">
                  <button
                    className="text-muted hover:text-danger"
                    onClick={() => {
                      if (confirm('Delete this transaction?')) remove.mutate(t.id);
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {list.data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No transactions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {list.data && list.data.total > list.data.limit && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">
            {list.data.total} total · page {list.data.page}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="btn-secondary"
            >
              Prev
            </button>
            <button
              disabled={list.data.page * list.data.limit >= list.data.total}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setDrawer(null)}
        >
          <div
            className="bg-card w-full max-w-md p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              {drawer.id ? 'Edit' : 'New'} transaction
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDrawer({ ...drawer, type: 'EXPENSE', categoryId: '' })}
                  className={
                    drawer.type === 'EXPENSE'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer({ ...drawer, type: 'INCOME', categoryId: '' })}
                  className={
                    drawer.type === 'INCOME'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }
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
                  value={drawer.amount}
                  onChange={(v) => setDrawer({ ...drawer, amount: v })}
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={drawer.date}
                  onChange={(e) => setDrawer({ ...drawer, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Account</label>
                <select
                  required
                  className="input"
                  value={drawer.accountId}
                  onChange={(e) => setDrawer({ ...drawer, accountId: e.target.value })}
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
                  value={drawer.categoryId}
                  onChange={(e) => setDrawer({ ...drawer, categoryId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Note</label>
                <input
                  className="input"
                  value={drawer.note}
                  onChange={(e) => setDrawer({ ...drawer, note: e.target.value })}
                />
              </div>
              {(tags.data?.length ?? 0) > 0 && (
                <div>
                  <label className="label">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {tags.data!.map((tg) => {
                      const active = drawer.tagIds.includes(tg.id);
                      return (
                        <button
                          type="button"
                          key={tg.id}
                          onClick={() =>
                            setDrawer({
                              ...drawer,
                              tagIds: active
                                ? drawer.tagIds.filter((x) => x !== tg.id)
                                : [...drawer.tagIds, tg.id],
                            })
                          }
                          className={
                            'badge border ' +
                            (active
                              ? 'border-primary text-primary'
                              : 'border-border text-muted')
                          }
                        >
                          {tg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDrawer(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createOrUpdate.isPending}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
