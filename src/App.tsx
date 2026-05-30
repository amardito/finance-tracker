import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useTheme } from './lib/theme';

const Layout = lazy(() => import('./components/Layout').then((m) => ({ default: m.Layout })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const TransactionsPage = lazy(() =>
  import('./pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
);
const ImportPage = lazy(() => import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })));
const BudgetsPage = lazy(() =>
  import('./pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage })),
);
const RecurringPage = lazy(() =>
  import('./pages/RecurringPage').then((m) => ({ default: m.RecurringPage })),
);
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function PageFallback() {
  return (
    <div className="p-6 space-y-3">
      <div className="skeleton h-6 w-40" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-32 w-full" />
    </div>
  );
}

export function App() {
  const { user, loading, load } = useAuth();
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initTheme();
    void load();
  }, [initTheme, load]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/import" element={<ImportPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
