// Action names from P22 (design document). Use these exact strings in auditLog({ action }).
// Format: <thing>.<what happened>. To add a new action, add it here in the same pull request.
const AUDIT_ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.password_reset',
  'driver.approve',
  'driver.reject',
  'vehicle.approve',
  'vehicle.reject',
  'user.suspend',
  'user.reactivate',
  'user.reveal_contact',
  'document.view',
  'ride.cancel',
  'booking.force_cancel',
  'report.resolve',
  'report.dismiss',
  'rating.hide',
  'config.update',
  'live.break_glass',
  'admin.invite',
  'role.change',
  'audit.export',
];

export { AUDIT_ACTIONS };
