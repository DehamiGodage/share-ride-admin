const mongoose = require('mongoose');
const AuditLog = require('../modules/audit/audit.model');
const { AUDIT_ACTIONS } = require('./auditActions');
const { httpError } = require('./httpError');

const KNOWN = new Set(AUDIT_ACTIONS);

/*
  Call after every sensitive action:

    await auditLog({
      req,                            // the Express request (gives admin id, role, IP)
      action: 'user.suspend',         // from core/auditActions.js
      targetType: 'user',             // 'user', 'driver_application', 'ride', 'report', 'setting', ...
      targetId: 'USR-1042',
      result: 'success',              // 'success' or 'failure'
      reason: 'Repeated no-shows',    // required for risky actions
      before: { status: 'active' },   // optional, for changes. Never put passwords, tokens or private data here.
      after:  { status: 'suspended' },
    });

  Optional:
    actor:  { id, name, role }  for events with no signed-in admin (auth.login_failed: use the email tried as id)
    strict: true                if the action must NOT go ahead when the entry cannot be saved (used by reveal)

  By default it never throws, so a database hiccup does not break the admin's request. The failure is logged.
*/
async function auditLog({ req, actor, action, targetType, targetId, result = 'success', reason, before, after, strict = false }) {
  if (!KNOWN.has(action)) console.warn(`[audit] unknown action "${action}". Add it to core/auditActions.js`);

  const who = actor || req?.user || {};
  const entry = {
    adminId: who.id || 'unknown',
    adminName: who.name,
    role: who.role,
    ip: req?.ip,
    userAgent: req?.get ? req.get('user-agent') : undefined,
    action,
    targetType,
    targetId,
    result,
    reason,
    before,
    after,
  };

  // No database connected (local development without MONGO_URL)
  if (mongoose.connection.readyState !== 1) {
    if (strict && process.env.NODE_ENV === 'production') {
      throw httpError(503, 'AUDIT_UNAVAILABLE', 'Cannot write the audit log, so the action was not done.');
    }
    console.log('[audit:no-db]', { time: new Date().toISOString(), ...entry });
    return null;
  }

  try {
    return await AuditLog.create(entry);
  } catch (err) {
    console.error('[audit] FAILED to save entry:', err.message, entry);
    if (strict) throw httpError(503, 'AUDIT_UNAVAILABLE', 'Cannot write the audit log, so the action was not done.');
    return null;
  }
}

module.exports = { auditLog };
