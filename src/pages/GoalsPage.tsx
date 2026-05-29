import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGoals } from '../lib/queries';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';
import { MoneyInput } from '../components/MoneyInput';

export function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const goals = useGoals();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contribute, setContribute] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '' });
  const [contribAmount, setContribAmount] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/goals', {
        name: form.name,
        targetAmount: form.targetAmount,
        deadline: form.deadline || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created');
      setOpen(false);
      setForm({ name: '', targetAmount: '', deadline: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contributeMut = useMutation({
    mutationFn: () =>
      api.post(`/api/goals/${contribute!.id}/contribute`, { amount: contribAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Contribution added');
      setContribute(null);
      setContribAmount('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Deleted');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + New goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(goals.data ?? []).map((g) => {
          const ratio = Math.min(1, Number(g.currentAmount) / Number(g.targetAmount));
          return (
            <div key={g.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  {g.deadline && (
                    <div className="text-xs text-muted">
                      by {new Date(g.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button onClick={() => remove.mutate(g.id)} className="text-muted hover:text-danger">
                  ✕
                </button>
              </div>
              <div className="text-sm flex justify-between mb-1">
                <span>
                  {money(g.currentAmount, currency)} / {money(g.targetAmount, currency)}
                </span>
                <span>{Math.round(ratio * 100)}%</span>
              </div>
              <div className="h-2 bg-border rounded">
                <div
                  className="h-2 rounded bg-primary"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <button
                className="btn-secondary mt-3 w-full"
                onClick={() => setContribute({ id: g.id, name: g.name })}
              >
                Add contribution
              </button>
              {g.status === 'DONE' && (
                <div className="badge bg-success/20 text-success mt-2">Completed</div>
              )}
            </div>
          );
        })}
        {goals.data?.length === 0 && (
          <div className="card text-center text-muted col-span-full">No goals yet.</div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New goal</h2>
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
                  required
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Target amount</label>
                <MoneyInput
                  required
                  className="input"
                  currency={currency}
                  value={form.targetAmount}
                  onChange={(v) => setForm({ ...form, targetAmount: v })}
                />
              </div>
              <div>
                <label className="label">Amount</label>
                <MoneyInput
                  required
                  className="input"
                  currency={currency}
                  value={contribAmount}
                  onChange={(v) => setContribAmount(v)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={create.isPending}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contribute && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setContribute(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">
              Contribute to {contribute.name}
            </h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                contributeMut.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="label">Amount</label>
                <MoneyInput
                  required
                  className="input"
                  currency={currency}
                  value={contribAmount}
                  onChange={(v) => setContribAmount(v)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContribute(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={contributeMut.isPending}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
