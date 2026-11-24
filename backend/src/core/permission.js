// STUB: lets every request through for now.
// On day 3 this is replaced by the real 4-role matrix (design document, section 2).
//
// Usage in a module's routes:
//   router.get('/',        requirePermission('users', 'view'), listUsers);
//   router.post('/:id/suspend', requirePermission('users', 'full'), suspendUser);
//
// area  = one of the rows in the matrix: 'dashboard', 'users', 'driver_applications',
//         'drivers_vehicles', 'rides_bookings', 'live_map', 'sos_reports', 'ratings',
//         'notifications', 'pricing_rules', 'content_locations', 'analytics',
//         'audit_log', 'system_health', 'admin_accounts'
// level = 'view' (read only) or 'full' (change data)

function requirePermission(area, level = 'view') {
  return (req, res, next) => {
    // TODO day 3: check req.user.role against the matrix and return 403 if not allowed
    next();
  };
}

module.exports = { requirePermission };