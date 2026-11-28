const REFRESH_KEY = 'sr_refresh_token';
const DEVICE_KEY = 'sr_device_token';  //Remember trusted devices for 30 days

// Access token is stored in memory only.
let accessToken = null;

// Handle browsers that restrict storage access.
function safeStorage(operation) {
  try {
    return operation();
  } catch {
    return null;
  }
}

// Access token
export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

// Refresh token
export function getRefreshToken() {
  return safeStorage(() =>
    sessionStorage.getItem(REFRESH_KEY)
  );
}

export function setRefreshToken(token) {
  return safeStorage(() => {
    if (token) {
      sessionStorage.setItem(REFRESH_KEY, token);
    } else {
      sessionStorage.removeItem(REFRESH_KEY);
    }
  });
}

// Trusted device token
export function getDeviceToken() {
  return safeStorage(() =>
    localStorage.getItem(DEVICE_KEY)
  );
}

export function setDeviceToken(token) {
  return safeStorage(() => {
    if (token) {
      localStorage.setItem(DEVICE_KEY, token);
    } else {
      localStorage.removeItem(DEVICE_KEY);
    }
  });
}

// Save tokens received from the backend.
export function saveSession(session) {
  setAccessToken(session.accessToken);
  setRefreshToken(session.refreshToken);

  if (session.deviceToken) {
    setDeviceToken(session.deviceToken);
  }
}

// Clear authentication tokens when signing out.
export function clearSession() {
  setAccessToken(null);
  setRefreshToken(null);
}

// Remove trusted device information.
export function clearTrustedDevice() {
  setDeviceToken(null);
}