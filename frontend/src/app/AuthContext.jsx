import { createContext, useContext, useMemo, useState } from 'react';

// STUB: no real login yet. The role is chosen from the top-bar menu (dev only) and saved in this browser.
// Real JWT login replaces this on day 3. Components should only use useAuth(): { user, role, setDevRole, signOut }.

const KEY = 'sr_dev_role';
const AuthContext = createContext(null);

export function getDevRole() {
  try {
    return localStorage.getItem(KEY) || 'super_admin';
  } catch {
    return 'super_admin';
  }
}

export function AuthProvider({ children }) {
  const [role, setRole] = useState(getDevRole());

  const value = useMemo(
    () => ({
      user: { id: 'USR-0001', name: 'Dev Admin', email: 'dev@shareride.lk', role },
      role,
      setDevRole: (r) => {
        try {
          localStorage.setItem(KEY, r);
        } catch {
          /* ignore */
        }
        setRole(r);
      },
      signOut: () => {
        window.location.assign('/login');
      },
    }),
    [role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
