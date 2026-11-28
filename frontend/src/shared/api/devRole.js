const KEY = 'sr_dev_role';

const ROLES = [
  'super_admin',
  'operations',
  'safety',
  'analyst',
];

export function getDevRole() {
  try {
    const role = localStorage.getItem(KEY);

    if (ROLES.includes(role)) {
      return role;
    }
  } catch {
    // Browser storage may be unavailable.
  }

  const defaultRole = import.meta.env.VITE_DEV_ROLE;

  return ROLES.includes(defaultRole)
    ? defaultRole
    : 'super_admin';
}

export function saveDevRole(role) {
  if (!ROLES.includes(role)) {
    return false;
  }

  try {
    localStorage.setItem(KEY, role);
    return true;
  } catch {
    return false;
  }
}