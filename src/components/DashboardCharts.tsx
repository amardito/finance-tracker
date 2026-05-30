import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../lib/format';
import type { Category } from '../lib/queries';

interface CashflowRow {
  date: string;
  net: string;
}

interface ByCategoryRow {
  categoryId: string;
  category: Category | null;
  type: string;
  amount: string;
}

interface DashboardChartsProps {
  currency: string;
  cashflowData: CashflowRow[];
  byCategoryData: ByCategoryRow[];
  cashflowPending: boolean;
  byCategoryPending: boolean;
}

export function DashboardCharts({
  currency,
  cashflowData,
  byCategoryData,
  cashflowPending,
  byCategoryPending,
}: DashboardChartsProps) {
  const [cashflowView, setCashflowView] = useState<'weeks' | 'week' | 'month-line'>('month-line');
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3 | 4 | null>(null);

  const expenseCats = byCategoryData.filter((r) => r.type === 'EXPENSE');
  const weeklyBars = useMemo(() => buildWeekBars(cashflowData), [cashflowData]);
  const selectedWeekBars = useMemo(
    () => (selectedWeek ? buildWeekDays(cashflowData, selectedWeek) : []),
    [cashflowData, selectedWeek],
  );
  const monthLine = useMemo(() => buildMonthLine(cashflowData), [cashflowData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card lg:col-span-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Cashflow</h3>
          <div className="flex gap-2">
            <button
              className={cashflowView === 'weeks' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                setCashflowView('weeks');
                setSelectedWeek(null);
              }}
            >
              Week 1-4
            </button>
            <button
              className={cashflowView === 'month-line' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                setCashflowView('month-line');
                setSelectedWeek(null);
              }}
            >
              Full Month
            </button>
          </div>
        </div>
        {cashflowPending && cashflowData.length === 0 ? (
          <div className="skeleton" style={{ width: '100%', height: 260 }} />
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            {cashflowView === 'month-line' ? (
              <ResponsiveContainer>
                <LineChart data={monthLine}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => money(v, currency)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="rgb(99 102 241)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : cashflowView === 'weeks' ? (
              <ResponsiveContainer>
                <BarChart
                  data={weeklyBars}
                  onClick={(state) => {
                    const payload = (
                      state as { activePayload?: Array<{ payload?: { week?: 1 | 2 | 3 | 4 } }> }
                    )?.activePayload?.[0]?.payload;
                    if (payload?.week) {
                      setSelectedWeek(payload.week);
                      setCashflowView('week');
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => money(v, currency)} />
                  <Legend />
                  <Bar dataKey="net" name="Net" fill="rgb(99 102 241)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-xs text-muted">
                  <span>Week {selectedWeek} detail</span>
                  <button className="text-primary" onClick={() => setCashflowView('weeks')}>
                    Back to Week 1-4
                  </button>
                </div>
                <ResponsiveContainer>
                  <BarChart data={selectedWeekBars}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => money(v, currency)} />
                    <Legend />
                    <Bar dataKey="net" name="Net" fill="rgb(16 185 129)" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="font-semibold mb-2">Expenses by category</h3>
        {byCategoryPending && byCategoryData.length === 0 ? (
          <div className="skeleton" style={{ width: '100%', height: 260 }} />
        ) : (
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
        )}
      </div>
    </div>
  );
}

function toDayOfMonth(input: string): number {
  return new Date(input).getDate();
}

function toNum(v: string): number {
  return Number(v) || 0;
}

function getWeekRange(week: 1 | 2 | 3 | 4): { start: number; end: number } {
  if (week === 1) return { start: 1, end: 7 };
  if (week === 2) return { start: 8, end: 14 };
  if (week === 3) return { start: 15, end: 21 };
  return { start: 22, end: 31 };
}

function buildWeekBars(rows: CashflowRow[]) {
  const bars = [
    { week: 1 as const, label: 'Week 1', net: 0 },
    { week: 2 as const, label: 'Week 2', net: 0 },
    { week: 3 as const, label: 'Week 3', net: 0 },
    { week: 4 as const, label: 'Week 4', net: 0 },
  ];
  for (const row of rows) {
    const d = toDayOfMonth(row.date);
    const idx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
    const target = bars[idx];
    if (target) target.net += toNum(row.net);
  }
  return bars;
}

function buildWeekDays(rows: CashflowRow[], week: 1 | 2 | 3 | 4) {
  const { start, end } = getWeekRange(week);
  const map = new Map<number, number>();
  for (let d = start; d <= end; d++) map.set(d, 0);
  for (const row of rows) {
    const d = toDayOfMonth(row.date);
    if (d >= start && d <= end) map.set(d, (map.get(d) ?? 0) + toNum(row.net));
  }
  return Array.from(map.entries()).map(([day, net]) => ({ label: String(day), net }));
}

function buildMonthLine(rows: CashflowRow[]) {
  const map = new Map<number, number>();
  for (let d = 1; d <= 31; d++) map.set(d, 0);
  for (const row of rows) {
    const d = toDayOfMonth(row.date);
    map.set(d, (map.get(d) ?? 0) + toNum(row.net));
  }
  return Array.from(map.entries()).map(([day, net]) => ({ label: String(day), net }));
}

export default DashboardCharts;
