const API_BASE = import.meta.env.VITE_API_URL || '';

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : '';
}

export interface ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let csrf = getCsrf();
    if (!csrf) {
      // Bootstrap CSRF cookie via a safe GET that goes through csrfProtect
      await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }).catch(() => undefined);
      csrf = getCsrf();
    }
    headers.set('X-XSRF-TOKEN', csrf);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; fields?: Record<string, string> } } = {};
    if (contentType.includes('application/json')) body = await res.json().catch(() => ({}));
    const err = new Error(body.error?.message || res.statusText) as ApiError;
    err.status = res.status;
    err.code = body.error?.code || 'UNKNOWN';
    err.fields = body.error?.fields;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, json?: unknown) => request<T>(p, { method: 'POST', json }),
  patch: <T>(p: string, json?: unknown) => request<T>(p, { method: 'PATCH', json }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, form: FormData) =>
    request<T>(p, { method: 'POST', body: form, headers: { 'X-XSRF-TOKEN': getCsrf() } }),
  csrfBootstrap: () => request<unknown>('/api/auth/me').catch(() => undefined),
};
