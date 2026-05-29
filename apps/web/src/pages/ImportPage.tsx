import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAccounts, useCategories } from '../lib/queries';

interface Preview {
  header: string[];
  rows: string[][];
  totalRows: number;
}

export function ImportPage() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const categories = useCategories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [delimiter, setDelimiter] = useState(',');
  const [mapping, setMapping] = useState<{ date: number; amount: number; note?: number }>({
    date: 0,
    amount: 1,
  });
  const [accountId, setAccountId] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [amountSign, setAmountSign] = useState<'positive_income' | 'sign_based'>('sign_based');
  const [busy, setBusy] = useState(false);

  const doPreview = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('delimiter', delimiter);
      const res = await api.upload<Preview>('/api/import/preview', fd);
      setPreview(res);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!file || !accountId || !defaultCategoryId) {
      toast.error('Select file, account, and default category');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append(
        'config',
        JSON.stringify({
          delimiter,
          accountId,
          defaultCategoryId,
          mapping,
          amountSign,
        }),
      );
      const res = await api.upload<{ inserted: number; errors: unknown[] }>(
        '/api/import/commit',
        fd,
      );
      toast.success(`Imported ${res.inserted} transactions`);
      navigate('/transactions');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Import CSV</h1>
      <div className="card space-y-3">
        <div>
          <label className="label">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className="label">Delimiter</label>
          <select
            className="input max-w-xs"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
          >
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="	">Tab</option>
          </select>
        </div>
        <button className="btn-primary" disabled={!file || busy} onClick={doPreview}>
          Preview
        </button>
      </div>

      {preview && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Map columns ({preview.totalRows} rows total)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <ColumnPicker
              label="Date column"
              header={preview.header}
              value={mapping.date}
              onChange={(v) => setMapping({ ...mapping, date: v })}
            />
            <ColumnPicker
              label="Amount column"
              header={preview.header}
              value={mapping.amount}
              onChange={(v) => setMapping({ ...mapping, amount: v })}
            />
            <ColumnPicker
              label="Note column (optional)"
              header={preview.header}
              value={mapping.note ?? -1}
              onChange={(v) => setMapping({ ...mapping, note: v === -1 ? undefined : v })}
              allowNone
            />
          </div>
          <div>
            <label className="label">Amount convention</label>
            <select
              className="input max-w-md"
              value={amountSign}
              onChange={(e) =>
                setAmountSign(e.target.value as 'positive_income' | 'sign_based')
              }
            >
              <option value="sign_based">Positive = expense, negative = income (debit/credit)</option>
              <option value="positive_income">Positive = income, negative = expense</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Account</label>
              <select
                className="input"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
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
              <label className="label">Default category</label>
              <select
                className="input"
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
              >
                <option value="">Select…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded">
            <table className="w-full text-xs">
              <thead className="bg-bg">
                <tr>
                  {preview.header.map((h, i) => (
                    <th key={i} className="p-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((c, j) => (
                      <td key={j} className="p-2">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn-primary" disabled={busy} onClick={commit}>
            Import {preview.totalRows} transactions
          </button>
        </div>
      )}
    </div>
  );
}

function ColumnPicker({
  label,
  header,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  header: string[];
  value: number;
  onChange: (v: number) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {allowNone && <option value={-1}>None</option>}
        {header.map((h, i) => (
          <option key={i} value={i}>
            [{i}] {h}
          </option>
        ))}
      </select>
    </div>
  );
}
