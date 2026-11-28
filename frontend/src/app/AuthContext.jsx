import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  api,
  refreshSession,
  setSessionLostHandler,
  DEV_BYPASS,
} from '../shared/api/client.js';

import {
  saveSession,
  clearSession,
  getRefreshToken,
} from '../shared/api/session.js';

import {
  getDevRole,
  saveDevRole,
} from '../shared/api/devRole.js';

export { getDevRole };

const AuthContext = createContext(null);

const SIGNED_OUT = {
  status: 'unauthenticated',
  user: null,
  permissions: {},
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    permissions: {},
  });

  const [error, setError] = useState(null);

  const operation = useRef(0);

  // Update authentication state after successful login.
  const setSignedIn = useCallback((user, permissions) => {
    setError(null);

    setState({
      status: 'authenticated',
      user,
      permissions: permissions || {},
    });
  }, []);

  // Update authentication state after logout.
  const setSignedOut = useCallback(() => {
    operation.current += 1;
    setState(SIGNED_OUT);
  }, []);

  // Restore the existing session when the app starts.
  useEffect(() => {
    let cancelled = false;
    const current = ++operation.current;

    async function restoreSession() {
      try {
        let session;

        if (DEV_BYPASS) {
          session = await api.get('/admin/me');
        } else if (getRefreshToken()) {
          session = await refreshSession();
        } else {
          if (!cancelled && current === operation.current) {
            setSignedOut();
          }

          return;
        }

        if (!cancelled && current === operation.current) {
          setSignedIn(
            session.user,
            session.permissions
          );
        }
      } catch (err) {
        if (!cancelled && current === operation.current) {
          if (err.status === 401 || err.status === 403) {
            clearSession();
          }

          setError(err);
          setSignedOut();
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [setSignedIn, setSignedOut]);

  // Automatically sign out when the API session expires.
  useEffect(() => {
    setSessionLostHandler(setSignedOut);

    return () => {
      setSessionLostHandler(null);
    };
  }, [setSignedOut]);

  // Called by the login and 2FA pages.
  const signIn = useCallback((session) => {
    if (
      !session?.accessToken ||
      !session?.refreshToken ||
      !session?.user
    ) {
      throw new Error('Invalid authentication session.');
    }

    operation.current += 1;

    saveSession(session);

    setSignedIn(
      session.user,
      session.permissions
    );
  }, [setSignedIn]);

  // Revoke the session on the backend and clear local tokens.
  const signOut = useCallback(async () => {
    const current = ++operation.current;
    const refreshToken = getRefreshToken();

    clearSession();
    setError(null);
    setState(SIGNED_OUT);

    try {
      if (refreshToken) {
        await api.post(
          '/auth/logout',
          { refreshToken },
          { auth: false }
        );
      }
    } catch (err) {
      if (current === operation.current) {
        setError(err);
      }

      console.warn('Server logout failed:', err.message);
    }
  }, []);

  // Check whether the current admin has a permission.
  const can = useCallback((area, level = 'view') => {
    const permission = state.permissions?.[area];

    return Boolean(
      permission &&
      (
        permission.full ||
        permission.actions?.includes(level)
      )
    );
  }, [state.permissions]);

  // Preserve the existing development role selector.
  const setDevRole = useCallback(async (role) => {
    if (!DEV_BYPASS) {
      return;
    }

    if (!saveDevRole(role)) {
      setError(new Error('Unable to save development role.'));
      return;
    }

    const current = ++operation.current;

    setError(null);

    try {
      const me = await api.get('/admin/me');

      if (current === operation.current) {
        setSignedIn(me.user, me.permissions);
      }
    } catch (err) {
      if (current === operation.current) {
        setError(err);
        setSignedOut();
      }
    }
  }, [setSignedIn, setSignedOut]);

  const value = useMemo(() => ({
    status: state.status,
    user: state.user,
    role: state.user?.role || null,
    permissions: state.permissions,

    isAuthenticated: state.status === 'authenticated',
    isLoading: state.status === 'loading',

    error,
    devBypass: DEV_BYPASS,

    signIn,
    signOut,
    can,
    setDevRole,
  }), [
    state,
    error,
    signIn,
    signOut,
    can,
    setDevRole,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}