import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  addSavedToken,
  loadSavedTokens,
  maskToken,
  removeSavedToken,
  renameSavedToken,
  SavedToken,
  useAuth,
} from '../lib/auth';
import { api } from '../lib/api';

type Mode = 'list' | 'generate' | 'sync';

export function LoginPage() {
  const { loginWithToken, generateToken } = useAuth();
  const [mode, setMode] = useState<Mode>('list');
  const [saved, setSaved] = useState<SavedToken[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [generated, setGenerated] = useState<string | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  useEffect(() => {
    void api.csrfBootstrap();
    const list = loadSavedTokens();
    setSaved(list);
    if (list.length === 0) setMode('generate');
  }, []);

  const useToken = async (token: string) => {
    setSubmitting(true);
    try {
      await loginWithToken(token);
      toast.success('Signed in');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const doGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await generateToken(labelInput || undefined);
      setGenerated(res.token);
      const next = addSavedToken(res.token, labelInput || undefined);
      setSaved(next);
      setLabelInput('');
      toast.success('New token created');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const doSync = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginWithToken(tokenInput.trim());
      const next = addSavedToken(tokenInput.trim(), labelInput || undefined);
      setSaved(next);
      setTokenInput('');
      setLabelInput('');
      toast.success('Token synced and signed in');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const doRemove = (token: string) => {
    const ok = window.confirm(
      'Remove this token from this device?\n\n' +
        'WARNING: This does NOT delete your data on the server.\n' +
        'If you have not saved the raw token elsewhere (password manager, file, etc),\n' +
        'you will permanently lose access to that account. Continue?',
    );
    if (!ok) return;
    const next = removeSavedToken(token);
    setSaved(next);
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-fg">
            $
          </span>
          <h1 className="text-xl font-semibold">Finance Tracker</h1>
        </div>

        <div className="flex gap-2 border-b border-border mb-4 text-sm">
          {(
            [
              ['list', 'My tokens'],
              ['generate', 'Generate new'],
              ['sync', 'Sync token'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setGenerated(null);
                setConfirmedSaved(false);
              }}
              className={
                'px-3 py-2 border-b-2 ' +
                (mode === m ? 'border-primary text-primary' : 'border-transparent text-muted')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'list' && (
          <div className="space-y-3">
            {saved.length === 0 && (
              <div className="text-sm text-muted">
                No saved tokens on this device. Generate a new one or sync an existing token.
              </div>
            )}
            {saved.map((t) => (
              <div key={t.token} className="card !p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    className="bg-transparent outline-none font-medium w-full"
                    value={t.label}
                    onChange={(e) => {
                      const next = renameSavedToken(t.token, e.target.value);
                      setSaved(next);
                    }}
                  />
                  <div className="text-xs text-muted font-mono truncate">
                    {maskToken(t.token)}
                  </div>
                </div>
                <button
                  className="text-xs text-muted hover:text-fg"
                  onClick={() => copy(t.token)}
                  title="Copy raw token"
                >
                  Copy
                </button>
                <button
                  className="btn-primary text-xs"
                  disabled={submitting}
                  onClick={() => useToken(t.token)}
                >
                  Use
                </button>
                <button
                  className="text-muted hover:text-danger"
                  onClick={() => doRemove(t.token)}
                  title="Remove from this device"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {mode === 'generate' && (
          <>
            {!generated && (
              <form onSubmit={doGenerate} className="space-y-3">
                <div className="text-sm text-muted">
                  Generates a brand-new anonymous account. The token will be shown ONCE — save it
                  somewhere safe. It is also stored on this device.
                </div>
                <div>
                  <label className="label">Label (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Personal"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? '…' : 'Generate new token'}
                </button>
              </form>
            )}
            {generated && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-warn">
                  Save this token now. It will never be shown again.
                </div>
                <div className="card !p-3 font-mono text-xs break-all">{generated}</div>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => copy(generated)}>
                    Copy
                  </button>
                  <button
                    className="btn-secondary flex-1"
                    onClick={() => {
                      const blob = new Blob([generated], { type: 'text/plain' });
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
                  onClick={() => useToken(generated)}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'sync' && (
          <form onSubmit={doSync} className="space-y-3">
            <div className="text-sm text-muted">
              Paste an existing token to sign in and add it to this device.
            </div>
            <div>
              <label className="label">Label (optional)</label>
              <input
                className="input"
                placeholder="e.g. Work laptop"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Token</label>
              <input
                className="input font-mono"
                required
                placeholder="ft_…"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? '…' : 'Sync and sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
