const { can } = require('./permissions');
const { auditLog } = require('./audit');
const { httpError } = require('./httpError');

const REVEALABLE = ['email', 'mobile', 'nic', 'licenceNumber', 'address', 'dateOfBirth'];

/*
  The only way to show masked private data. It:
    1. checks the admin's permission for the area,
    2. requires a written reason,
    3. writes the audit entry FIRST (without the revealed values), and refuses to reveal if that fails,
    4. returns just the requested fields.

  In a controller:

    const values = await revealFields({
      req,
      area: 'users',          // permission area, the admin needs "level" on it
      level: 'full',
      targetType: 'user',
      targetId: user.id,
      record: user,           // the full, unmasked record loaded from the database
      fields: req.body.fields,
      reason: req.body.reason,
      action: 'user.reveal_contact',   // optional, default
    });
    res.json({ data: values });
*/
async function revealFields({ req, area, level = 'full', targetType, targetId, record, fields, reason, action = 'user.reveal_contact' }) {
  if (!can(req.user?.role, area, level)) {
    throw httpError(403, 'FORBIDDEN', 'Your role may not reveal this data.');
  }
  if (typeof reason !== 'string' || reason.trim().length < 5) {
    throw httpError(400, 'VALIDATION_ERROR', 'A written reason is required to reveal private data.');
  }
  if (!Array.isArray(fields) || fields.length === 0 || !fields.every((f) => REVEALABLE.includes(f))) {
    throw httpError(400, 'VALIDATION_ERROR', `fields must be a non-empty list from: ${REVEALABLE.join(', ')}`);
  }

  // Audit first. We record WHICH fields were revealed, never the values.
  await auditLog({ req, action, targetType, targetId, reason: reason.trim(), after: { revealed: fields }, strict: true });

  const out = {};
  for (const f of fields) out[f] = record?.[f] ?? null;
  return out;
}

module.exports = { revealFields, REVEALABLE };
