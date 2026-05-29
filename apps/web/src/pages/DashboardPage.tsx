import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';
import {
  useAccounts,
  useBudgetProgress,
  useByCategory,
  useCashflow,
  useSummary,
  useTransactions,
} from '../lib/queries';

export function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const range = {
    from: startOfMonth(now).toISOString(),
    to: endOfMonth(now).toISOString(),
  };
  const accounts = useAccounts();
  const summary = useSummary(range);
  const cashflow = useCashflow(range);
  const byCat = useByCategory(range);
  const budgets = useBudgetProgress();
  const recent = useTransactions({ limit: 8, page: 1 });

  const expenseCats = (byCat.data ?? []).filter((r) => r.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-muted text-sm">
          {format(now, 'MMMM yyyy')} overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Net Worth" value={summary.data?.netWorth} currency={currency} />
        <Stat title="Income (MTD)" value={summary.data?.income} currency={currency} tone="success" />
        <Stat title="Expense (MTD)" value={summary.data?.expense} currency={currency} tone="danger" />
        <Stat title="Net (MTD)" value={summary.data?.net} currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold mb-2">Cashflow</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={cashflow.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(s) => s.slice(5)} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="rgb(16 185 129)" />
                <Bar dataKey="expense" fill="rgb(239 68 68)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Expenses by category</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseCats.map((r) => ({
                    name: r.category?.name ?? 'Unknown',
                    value: Number(r.amount),
                    color: r.category?.color ?? '#94a3b8',
                  }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                >
                  {expenseCats.map((r, i) => (
                    <Cell key={i} fill={r.category?.color ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => money(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">Budgets</h3>
            <Link to="/budgets" className="text-sm text-primary">Manage →</Link>
          </div>
          {(budgets.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No budgets yet.</p>
          ) : (
            <ul className="space-y-3">
              {budgets.data!.slice(0, 5).map((b) => (
                <li key={b.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.category.name}</span>
                    <span className="text-muted">
                      {money(b.spent, currency)} / {money(b.amount, currency)}
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
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">Recent transactions</h3>
            <Link to="/transactions" className="text-sm text-primary">View all →</Link>
          </div>
          {(recent.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.data!.items.map((t) => (
                <li key={t.id} className="py-2 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{t.note || t.category.name}</div>
                    <div className="text-muted text-xs">
                      {format(new Date(t.date), 'MMM d')} · {t.account.name}
                    </div>
                  </div>
                  <div
                    className={
                      t.type === 'INCOME' ? 'text-success font-medium' : 'text-danger font-medium'
                    }
                  >
                    {t.type === 'INCOME' ? '+' : '-'}
                    {money(t.amount, currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Accounts</h3>
        {(accounts.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">
            No accounts yet. <Link to="/settings" className="text-primary">Add one →</Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.data!.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3">
                <div className="text-xs text-muted">{a.type}</div>
                <div className="font-medium">{a.name}</div>
                <div className="text-lg">{money(a.balance, a.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  currency,
  tone,
}: {
  title: string;
  value?: string;
  currency: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{title}</div>
      <div
        className={
          'text-2xl font-semibold mt-1 ' +
          (tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : '')
        }
      >
        {value !== undefined ? money(value, currency) : '—'}
      </div>
    </div>
  );
}
