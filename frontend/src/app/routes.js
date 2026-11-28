// Single source of truth for every page: URL, who may open it, and where it appears in the sidebar.
// "id" is the page number from the design document (P01 to P26).
// "group" and "icon" are only set for pages that appear in the sidebar.

export const ROLE = {
  SUPER: 'super_admin',
  OPS: 'operations',
  SAFETY: 'safety',
  ANALYST: 'analyst',
};
export const ROLE_LABEL = {
  super_admin: 'Super Admin',
  operations: 'Operations Admin',
  safety: 'Safety & Support',
  analyst: 'Analyst',
};

const { SUPER, OPS, SAFETY, ANALYST } = ROLE;
const ALL = [SUPER, OPS, SAFETY, ANALYST];

export const GROUP_ORDER = [
  'Overview',
  'People',
  'Operations',
  'Safety & trust',
  'Communication',
  'Configuration',
  'Insights',
  'Administration',
];

export const APP_ROUTES = [
  { id: 'P03', path: '/', title: 'Dashboard', roles: ALL, group: 'Overview', icon: 'LayoutDashboard' },

  { id: 'P04', path: '/users', title: 'Users', roles: [SUPER, OPS, SAFETY], group: 'People', icon: 'Users' },
  { id: 'P05', path: '/users/:id', title: 'User detail', roles: [SUPER, OPS, SAFETY], parent: 'P04' },
  { id: 'P06', path: '/driver-applications', title: 'Driver applications', roles: [SUPER, OPS, SAFETY], group: 'People', icon: 'FileCheck' },
  { id: 'P07', path: '/driver-applications/:id', title: 'Application review', roles: [SUPER, OPS], parent: 'P06' },
  { id: 'P08', path: '/drivers', title: 'Drivers & compliance', roles: [SUPER, OPS, SAFETY], group: 'People', icon: 'ShieldCheck' },
  { id: 'P09', path: '/vehicles', title: 'Vehicles', roles: [SUPER, OPS], group: 'People', icon: 'Car' },

  { id: 'P10', path: '/rides', title: 'Rides', roles: ALL, group: 'Operations', icon: 'Route' },
  { id: 'P11', path: '/rides/:id', title: 'Ride detail', roles: ALL, parent: 'P10' },
  { id: 'P12', path: '/bookings', title: 'Bookings', roles: ALL, group: 'Operations', icon: 'Ticket' },
  { id: 'P13', path: '/live', title: 'Live monitoring', roles: ALL, group: 'Operations', icon: 'Radio' },

  { id: 'P14', path: '/safety', title: 'SOS & safety alerts', roles: [SUPER, SAFETY], group: 'Safety & trust', icon: 'AlertTriangle' },
  { id: 'P15', path: '/reports', title: 'Reports', roles: [SUPER, SAFETY, OPS], group: 'Safety & trust', icon: 'Flag' },
  { id: 'P16', path: '/reports/:id', title: 'Report case', roles: [SUPER, SAFETY], parent: 'P15' },
  { id: 'P17', path: '/ratings', title: 'Ratings & reviews', roles: ALL, group: 'Safety & trust', icon: 'Star' },

  { id: 'P18', path: '/notifications', title: 'Notifications', roles: [SUPER, OPS, SAFETY], group: 'Communication', icon: 'Bell' },

  { id: 'P19', path: '/settings/rules', title: 'Pricing & rules', roles: [SUPER, OPS, ANALYST], group: 'Configuration', icon: 'SlidersHorizontal' },
  { id: 'P20', path: '/content', title: 'Content & locations', roles: [SUPER, OPS, SAFETY], group: 'Configuration', icon: 'MapPin' },

  { id: 'P21', path: '/analytics', title: 'Analytics', roles: ALL, group: 'Insights', icon: 'BarChart3' },

  { id: 'P22', path: '/audit', title: 'Audit log', roles: [SUPER, OPS, SAFETY], group: 'Administration', icon: 'ScrollText' },
  { id: 'P23', path: '/system', title: 'System health', roles: [SUPER, OPS, ANALYST], group: 'Administration', icon: 'Activity' },
  { id: 'P24', path: '/admins', title: 'Admin accounts & roles', roles: [SUPER], group: 'Administration', icon: 'UserCog' },

  { id: 'P25', path: '/account', title: 'My account & security', roles: ALL },
];

// Pages shown without the app shell (public).
export const PUBLIC_ROUTES = [
  { id: 'P01', path: '/login', title: 'Sign in' },
  { id: 'P02', path: '/forgot-password', title: 'Forgot password' },
  { id: 'P02', path: '/reset-password', title: 'Reset password' },
];


// Backend permission required for each admin page.
export const ROUTE_PERMISSIONS = {
  P03: { area: 'dashboard' },

  P04: { area: 'users' },
  P05: { area: 'users' },

  P06: { area: 'driver_applications' },
  P07: { area: 'driver_applications', level: 'full' },

  P08: { area: 'drivers_vehicles' },
  P09: { area: 'drivers_vehicles', level: 'full' },

  P10: { area: 'rides_bookings' },
  P11: { area: 'rides_bookings' },
  P12: { area: 'rides_bookings' },

  P13: { area: 'live_map' },

  P14: { area: 'sos_reports', level: 'full' },
  P15: { area: 'sos_reports' },
  P16: { area: 'sos_reports', level: 'full' },

  P17: { area: 'ratings' },

  P18: { area: 'notifications' },

  P19: { area: 'pricing_rules' },
  P20: { area: 'content_locations' },

  P21: { area: 'analytics' },

  P22: { area: 'audit_log' },
  P23: { area: 'system_health' },
  P24: { area: 'admin_accounts' },

  // Available to every authenticated admin.
  P25: null,
};