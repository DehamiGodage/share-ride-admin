import { getDevRole } from './devRole.js';

import {
  getAccessToken,
  getRefreshToken,
  saveSession,
  clearSession,
} from './session.js';

const BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Development bypass must never run in a production build.
export const DEV_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

// Standard API error format.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Notify AuthContext when a session expires.
let onSessionLost = () => {};

export function setSessionLostHandler(handler) {
  onSessionLost = handler || (() => {});
}

// Parse backend responses.
async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Convert backend errors into ApiError.
function toError(response, data) {
  const error = data?.error;

  return new ApiError(
    response.status,
    error?.code || 'SERVER_ERROR',
    error?.message || 'Something went wrong.',
    error?.details
  );
}

// Build URL with query parameters.
function buildUrl(path, params) {
  const url = new URL(path, BASE);

  if (url.origin !== new URL(BASE).origin) {
    throw new ApiError(
      0,
      'INVALID_URL',
      'Invalid API destination.'
    );
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

// Handle network failures.
async function sendRequest(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection.'
    );
  }
}

// Only allow one refresh request at a time.
let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new ApiError(
          401,
          'UNAUTHENTICATED',
          'Please sign in.'
        );
      }

      const response = await sendRequest(
        buildUrl('/auth/refresh'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw toError(response, data);
      }

      // Prevent an old refresh request from restoring
      // a session that has already been cleared.
      if (getRefreshToken() !== refreshToken) {
        throw new ApiError(
          401,
          'UNAUTHENTICATED',
          'Session has changed.'
        );
      }

      saveSession(data.data);

      return data.data;
    })().finally(() => {
      refreshing = null;
    });
  }

  return refreshing;
}

function expireSession() {
  clearSession();
  onSessionLost();
}

// Main API request function.
export async function request(
  path,
  {
    method = 'GET',
    body,
    params,
    auth = true,
    retry = true,
  } = {}
) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = auth ? getAccessToken() : null;

  if (auth) {
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (DEV_BYPASS) {
      headers['x-dev-role'] = getDevRole();
    }
  }

  const response = await sendRequest(
    buildUrl(path, params),
    {
      method,
      headers,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }
  );

  // Refresh expired authentication once.
  if (
    response.status === 401 &&
    auth &&
    retry &&
    !DEV_BYPASS
  ) {
    try {
      // Another request may have already refreshed
      // the access token.
      if (!getAccessToken() || getAccessToken() === token) {
        await refreshSession();
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        expireSession();
      }

      throw error;
    }

    return request(path, {
      method,
      body,
      params,
      auth,
      retry: false,
    });
  }

  // The retried request also failed authentication.
  if (
    response.status === 401 &&
    auth &&
    !retry &&
    !DEV_BYPASS
  ) {
    expireSession();
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw toError(response, data);
  }

  return data;
}

// Shared API methods for all frontend modules.
export const api = {
  get: (path, params, options) =>
    request(path, {
      ...options,
      params,
    }),

  post: (path, body, options) =>
    request(path, {
      ...options,
      method: 'POST',
      body,
    }),

  put: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PUT',
      body,
    }),

  patch: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PATCH',
      body,
    }),

  delete: (path, options) =>
    request(path, {
      ...options,
      method: 'DELETE',
    }),
};