import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from './auth';

const BASE = '/api';  // nginx proxies /api → backend:3001

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = await res.json();
  storeTokens(data.access_token, data.refresh_token);
  return true;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = getAccessToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, options, false); // one retry
    clearTokens();
    window.location.href = '/login';
  }

  return res;
}
