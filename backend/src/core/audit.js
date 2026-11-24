// STUB: only prints to the console for now.
// On day 3 this is replaced by a real append-only audit_logs writer (design document, P22).

async function auditLog({
  req,
  action,
  targetType,
  targetId,
  result = 'success',
  reason,    
  before,
  after,
}) {
  // TODO day 3: save to the audit_logs collection (append-only)
  console.log('[audit]', {
    time: new Date().toISOString(),
    adminId: req?.user?.id,
    role: req?.user?.role,
    ip: req?.ip,
    action,
    targetType,
    targetId,
    result,
    reason,
    before,
    after,
  });
}

module.exports = { auditLog };

// Action names from P22: auth.login, auth.login_failed, driver.approve, driver.reject,
// vehicle.approve, user.suspend, user.reactivate, user.reveal_contact, document.view,
// ride.cancel, report.resolve, config.update, live.break_glass, admin.invite, role.change