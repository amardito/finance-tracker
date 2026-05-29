import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useByCategory, useCashflow, useSummary } from '../lib/queries';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';

export function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [from, setFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const range = { from, to };
  const summary = useSummary(range);
  const cashflow = useCashflow(range);
  const byCat = useByCategory(range);

  const downloadCsv = () => {
    const qs = new URLSearchParams({ from, to });
    window.location.href = `/api/reports/export.csv?${qs.toString()}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={downloadCsv} className="btn-primary">
          Download CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-sm text-muted">Income</div>
          <div className="text-2xl font-semibold text-success">
            {summary.data ? money(summary.data.income, currency) : '—'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Expense</div>
          <div className="text-2xl font-semibold text-danger">
            {summary.data ? money(summary.data.expense, currency) : '—'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Net</div>
          <div className="text-2xl font-semibold">
            {summary.data ? money(summary.data.net, currency) : '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Cashflow (cumulative net)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={cumulativeNet(cashflow.data ?? [])}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tickFormatter={(s) => s.slice(5)} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cum" name="Cumulative net" stroke="#6366f1" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">By category</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={(byCat.data ?? [])
                .filter((r) => r.type === 'EXPENSE')
                .map((r) => ({
                  name: r.category?.name ?? 'Unknown',
                  amount: Number(r.amount),
                  color: r.category?.color ?? '#94a3b8',
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => money(v, currency)} />
              <Bar dataKey="amount" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function cumulativeNet(rows: { date: string; net: string }[]) {
  let cum = 0;
  return rows.map((r) => {
    cum += Number(r.net);
    return { date: r.date, cum };
  });
}
