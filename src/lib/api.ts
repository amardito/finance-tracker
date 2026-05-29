const API_BASE = import.meta.env.VITE_API_URL || '';

// In-memory CSRF token. We can't read the XSRF-TOKEN cookie cross-origin, so we fetch
// the token from a dedicated /api/csrf endpoint and cache it. The endpoint also issues
// the cookie via Set-Cookie, which the browser stores for same-site requests to the API.
let csrfToken: string | null = null;

function getCsrfFromCookie(): string {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : '';
}

async function fetchCsrf(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/csrf`, { credentials: 'include' });
    if (res.ok) {
      const body = (await res.json()) as { token?: string | null };
      if (body.token) {
        csrfToken = body.token;
        return body.token;
      }
    }
  } catch {
    /* network errors handled by caller */
  }
  return '';
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
    // Prefer in-memory token (cross-origin friendly). Fall back to same-origin cookie.
    let csrf = csrfToken || getCsrfFromCookie();
    if (!csrf) {
      csrf = await fetchCsrf();
    }
    if (csrf) headers.set('X-XSRF-TOKEN', csrf);
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
    // If the server complains about CSRF, refresh the token once and retry the same request.
    if (res.status === 403 && err.code === 'CSRF' && !options.headers?.toString().includes('retry')) {
      csrfToken = null;
      const fresh = await fetchCsrf();
      if (fresh) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Accept', 'application/json');
        if (options.json !== undefined) retryHeaders.set('Content-Type', 'application/json');
        retryHeaders.set('X-XSRF-TOKEN', fresh);
        retryHeaders.set('x-csrf-retry', '1');
        const res2 = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });
        if (res2.ok) {
          if (res2.status === 204) return undefined as T;
          const ct2 = res2.headers.get('content-type') || '';
          if (ct2.includes('application/json')) return (await res2.json()) as T;
          return (await res2.text()) as unknown as T;
        }
        const body2: { error?: { code?: string; message?: string; fields?: Record<string, string> } } = ct2IsJson(res2)
          ? await res2.json().catch(() => ({}))
          : {};
        const err2 = new Error(body2.error?.message || res2.statusText) as ApiError;
        err2.status = res2.status;
        err2.code = body2.error?.code || 'UNKNOWN';
        err2.fields = body2.error?.fields;
        throw err2;
      }
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

function ct2IsJson(res: Response): boolean {
  return (res.headers.get('content-type') || '').includes('application/json');
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, json?: unknown) => request<T>(p, { method: 'POST', json }),
  patch: <T>(p: string, json?: unknown) => request<T>(p, { method: 'PATCH', json }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, form: FormData) =>
    request<T>(p, { method: 'POST', body: form }),
  csrfBootstrap: () => fetchCsrf(),
};
