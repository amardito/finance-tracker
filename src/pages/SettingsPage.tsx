import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccounts, useCategories, useTags } from '../lib/queries';
import { addSavedToken, useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { MoneyInput } from '../components/MoneyInput';
import { Link } from 'react-router-dom';

type Tab = 'accounts' | 'categories' | 'tags' | 'profile';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Link to="/onboarding" className="btn-secondary self-start sm:self-auto">
          Setup assistant
        </Link>
      </div>
      <div className="flex gap-2 border-b border-border">
        {(['accounts', 'categories', 'tags', 'profile'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-3 py-2 text-sm border-b-2 ' +
              (tab === t ? 'border-primary text-primary' : 'border-transparent text-muted')
            }
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}

function AccountsTab() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const accounts = useAccounts();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'CHECKING', openingBalance: '0' });

  const create = useMutation({
    mutationFn: () => api.post('/api/accounts', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created');
      setForm({ name: '', type: 'CHECKING', openingBalance: '0' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Add account</h3>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
          <div>
            <label className="label">Opening balance</label>
            <MoneyInput
              className="input"
              currency={currency}
              value={form.openingBalance}
              onChange={(v) => setForm({ ...form, openingBalance: v })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            Add
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Accounts</h3>
        <ul className="divide-y divide-border">
          {(accounts.data ?? []).map((a) => (
            <li key={a.id} className="py-2 flex justify-between items-center">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted">{a.type}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">{money(a.balance, currency)}</div>
                <button
                  onClick={() => {
                    if (confirm('Delete account?')) remove.mutate(a.id);
                  }}
                  className="text-muted hover:text-danger"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const categories = useCategories();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    color: '#6366f1',
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/categories', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Created');
      setForm({ name: '', type: 'EXPENSE', color: '#6366f1' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Add category</h3>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' })
              }
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              className="input h-10"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            Add
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Categories</h3>
        <ul className="divide-y divide-border">
          {(categories.data ?? []).map((c) => (
            <li key={c.id} className="py-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{c.type}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete category?')) remove.mutate(c.id);
                }}
                className="text-muted hover:text-danger"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TagsTab() {
  const tags = useTags();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', color: '#94a3b8' });

  const create = useMutation({
    mutationFn: () => api.post('/api/tags', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Created');
      setForm({ name: '', color: '#94a3b8' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Add tag</h3>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              className="input h-10"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            Add
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Tags</h3>
        <ul className="divide-y divide-border">
          {(tags.data ?? []).map((t) => (
            <li key={t.id} className="py-2 flex justify-between items-center">
              <span className="badge" style={{ backgroundColor: t.color + '33', color: t.color }}>
                {t.name}
              </span>
              <button
                onClick={() => {
                  if (confirm('Delete tag?')) remove.mutate(t.id);
                }}
                className="text-muted hover:text-danger"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, logout, rotateToken, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'USD');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const save = async () => {
    try {
      await updateProfile({ name, currency });
      toast.success('Profile updated');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doRotate = async () => {
    const ok = window.confirm(
      'Rotate token?\n\n' +
        'Your old token will stop working immediately.\n' +
        'Any other device using the old token will be logged out and unable to log back in.\n' +
        'You will be shown the new token ONCE — save it somewhere safe.',
    );
    if (!ok) return;
    try {
      const token = await rotateToken();
      setNewToken(token);
      setConfirmedSaved(false);
      const updated = addSavedToken(token, `Rotated ${new Date().toLocaleString()}`);
      void updated;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="card max-w-md space-y-3">
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Currency</label>
        <select
          className="input"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="IDR">IDR</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="JPY">JPY</option>
          <option value="SGD">SGD</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="btn-primary">
          Save profile
        </button>
        <button onClick={() => logout()} className="btn-danger">
          Sign out
        </button>
      </div>

      <hr className="border-border" />

      <div>
        <div className="label">Access token</div>
        <div className="text-xs text-muted mb-2">
          Your token is what proves ownership of this account. Keep it safe — anyone with the
          token can access this data. We never see your raw token after creation.
        </div>
        {!newToken && (
          <button onClick={doRotate} className="btn-secondary">
            Rotate token
          </button>
        )}
        {newToken && (
          <div className="space-y-2 mt-2">
            <div className="text-sm font-medium text-warn">
              Save this token now. It will never be shown again.
            </div>
            <div className="card !p-3 font-mono text-xs break-all">{newToken}</div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => copy(newToken)}>
                Copy
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  const blob = new Blob([newToken], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'finance-tracker-token.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={(e) => setConfirmedSaved(e.target.checked)}
              />
              <span>I have saved this token somewhere safe.</span>
            </label>
            <button
              className="btn-primary w-full"
              disabled={!confirmedSaved}
              onClick={() => setNewToken(null)}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
