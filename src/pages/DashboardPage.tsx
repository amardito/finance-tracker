import { lazy, Suspense } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Link } from 'react-router-dom';
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

const DashboardCharts = lazy(() => import('../components/DashboardCharts'));

function ChartsFallback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card lg:col-span-2">
        <div className="skeleton h-5 w-32 mb-2" />
        <div className="skeleton" style={{ width: '100%', height: 260 }} />
      </div>
      <div className="card">
        <div className="skeleton h-5 w-40 mb-2" />
        <div className="skeleton" style={{ width: '100%', height: 260 }} />
      </div>
    </div>
  );
}

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
  const isRefreshing = [accounts, summary, cashflow, byCat, budgets, recent].some(
    (q) => q.isFetching,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-muted text-sm">{format(now, 'MMMM yyyy')} overview</p>
        {isRefreshing && (
          <p className="mt-2 text-xs text-muted inline-flex items-center gap-2">
            <span className="spinner" />
            Refreshing data...
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          title="Net Worth"
          value={summary.data?.netWorth}
          currency={currency}
          loading={summary.isPending}
        />
        <Stat
          title="Income (MTD)"
          value={summary.data?.income}
          currency={currency}
          tone="success"
          loading={summary.isPending}
        />
        <Stat
          title="Expense (MTD)"
          value={summary.data?.expense}
          currency={currency}
          tone="danger"
          loading={summary.isPending}
        />
        <Stat
          title="Net (MTD)"
          value={summary.data?.net}
          currency={currency}
          loading={summary.isPending}
        />
      </div>

      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts
          currency={currency}
          cashflowData={cashflow.data ?? []}
          byCategoryData={byCat.data ?? []}
          cashflowPending={cashflow.isPending}
          byCategoryPending={byCat.isPending}
        />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">Budgets</h3>
            <Link to="/budgets" className="text-sm text-primary">
              Manage →
            </Link>
          </div>
          {budgets.isPending && !budgets.data ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-2 w-full" />
                </li>
              ))}
            </ul>
          ) : (budgets.data?.length ?? 0) === 0 ? (
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
            <Link to="/transactions" className="text-sm text-primary">
              View all →
            </Link>
          </div>
          {recent.isPending && !recent.data ? (
            <ul className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-3 w-24" />
                  </div>
                  <div className="skeleton h-4 w-20" />
                </li>
              ))}
            </ul>
          ) : (recent.data?.items.length ?? 0) === 0 ? (
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
        {accounts.isPending && !accounts.data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border p-3 space-y-2">
                <div className="skeleton h-3 w-12" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-6 w-28" />
              </div>
            ))}
          </div>
        ) : (accounts.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">
            No accounts yet.{' '}
            <Link to="/settings" className="text-primary">
              Add one →
            </Link>
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
  loading,
}: {
  title: string;
  value?: string;
  currency: string;
  tone?: 'success' | 'danger';
  loading?: boolean;
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
        {loading && value === undefined ? (
          <span className="skeleton inline-block h-8 w-28 align-middle" />
        ) : value !== undefined ? (
          money(value, currency)
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}
