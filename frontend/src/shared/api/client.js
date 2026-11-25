import { getDevRole } from '../../app/AuthContext';

// One place for every call to the backend. Pages use api.get(...), api.post(...) and so on.
// Success and error formats are defined in docs/api-contract.yaml.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code; // e.g. FORBIDDEN, VALIDATION_ERROR, CONFLICT
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  // STUB: replaced by "Authorization: Bearer <token>" when real login is added.
  headers['x-dev-role'] = getDevRole();

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    throw new ApiError(res.status, e.code || 'SERVER_ERROR', e.message || 'Something went wrong', e.details);
  }
  return data; // { data, meta? }
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
