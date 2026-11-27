// Real 4-role permission matrix (design document, section 2).
//
// Usage in a module's routes:
//   router.get('/',             requirePermission('users', 'view'),    listUsers);
//   router.post('/:id/suspend', requirePermission('users', 'suspend'), suspendUser);
//
// Levels:  'view' | 'suspend' | 'send' | 'full'
// After a successful check, the handler can read req.access = { area, level, full, scope }
//   scope: null
//        | 'own'         audit log: return only the current admin's own actions
//        | 'aggregates'  dashboard: aggregates only, no personal queues
//        | 'counts'      live map: counts only, no positions
//        | 'anonymised'  rides and bookings: no personal data

const ROLES = ['super_admin', 'operations', 'safety', 'analyst'];
const LEVELS = ['view', 'suspend', 'send', 'full'];

const FULL = { full: true, actions: [], scope: null };
const NONE = null;
const grant = (actions, scope = null) => ({ full: false, actions, scope });
const VIEW = grant(['view']);

const MATRIX = {
  dashboard:           { super_admin: FULL, operations: FULL, safety: FULL, analyst: grant(['view'], 'aggregates') },
  users:               { super_admin: FULL, operations: FULL, safety: grant(['view', 'suspend']), analyst: NONE },
  driver_applications: { super_admin: FULL, operations: FULL, safety: VIEW, analyst: NONE },
  drivers_vehicles:    { super_admin: FULL, operations: FULL, safety: VIEW, analyst: NONE },
  rides_bookings:      { super_admin: FULL, operations: FULL, safety: VIEW, analyst: grant(['view'], 'anonymised') },
  live_map:            { super_admin: FULL, operations: grant(['view'], 'counts'), safety: FULL, analyst: grant(['view'], 'counts') },
  sos_reports:         { super_admin: FULL, operations: VIEW, safety: FULL, analyst: NONE },
  ratings:             { super_admin: FULL, operations: VIEW, safety: FULL, analyst: VIEW },
  notifications:       { super_admin: FULL, operations: grant(['view', 'send']), safety: grant(['view', 'send']), analyst: NONE },
  pricing_rules:       { super_admin: FULL, operations: VIEW, safety: NONE, analyst: VIEW },
  content_locations:   { super_admin: FULL, operations: VIEW, safety: VIEW, analyst: NONE },
  analytics:           { super_admin: FULL, operations: FULL, safety: FULL, analyst: FULL },
  audit_log:           { super_admin: FULL, operations: grant(['view'], 'own'), safety: grant(['view'], 'own'), analyst: NONE },
  system_health:       { super_admin: FULL, operations: VIEW, safety: NONE, analyst: VIEW },
  admin_accounts:      { super_admin: FULL, operations: NONE, safety: NONE, analyst: NONE },
};

function allows(g, level) {
  if (!g) return false;
  if (g.full) return true;
  if (level === 'full') return false;
  return g.actions.includes(level);
}

function assertKnown(area, level) {
  if (!MATRIX[area]) throw new Error(`Unknown permission area "${area}"`);
  if (!LEVELS.includes(level)) throw new Error(`Unknown permission level "${level}"`);
}

// can('safety', 'users', 'suspend') -> true
function can(role, area, level = 'view') {
  assertKnown(area, level);
  return allows(MATRIX[area][role], level);
}

function allowedRoles(area, level) {
  return ROLES.filter((r) => allows(MATRIX[area][r], level));
}

// Everything one role may do. Used by GET /admin/me so the frontend can hide menu groups.
function permissionsFor(role) {
  const out = {};
  for (const [area, row] of Object.entries(MATRIX)) {
    const g = row[role];
    out[area] = g ? { full: g.full, actions: g.full ? LEVELS : g.actions, scope: g.scope } : null;
  }
  return out;
}

function requirePermission(area, level = 'view') {
  // Throws when the server starts if someone mistypes an area or level
  assertKnown(area, level);

  return (req, res, next) => {
    const g = MATRIX[area][req.user?.role];
    if (!allows(g, level)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Your role does not have access to this action.',
          details: { area, level, allowedRoles: allowedRoles(area, level) },
        },
      });
    }
    req.access = { area, level, full: g.full, scope: g.scope };
    return next();
  };
}

export { requirePermission, can, permissionsFor, ROLES };