const express = require('express');
const mongoose = require('mongoose');
const { requirePermission } = require('../../core/permissions');
const { httpError } = require('../../core/httpError');
const AuditLog = require('./audit.model');

const router = express.Router();

function toItem(d) {
  return {
    id: String(d._id),
    time: d.time,
    adminId: d.adminId,
    adminName: d.adminName,
    role: d.role,
    action: d.action,
    targetType: d.targetType,
    targetId: d.targetId,
    result: d.result,
    ip: d.ip,
    reason: d.reason ?? null,
    before: d.before ?? null,
    after: d.after ?? null,
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /admin/audit   (contract: docs/api-contract.yaml, P22)
// Operations and Safety see only their own actions (req.access.scope === 'own').
router.get('/', requirePermission('audit_log', 'view'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = [25, 50, 100].includes(parseInt(req.query.limit, 10)) ? parseInt(req.query.limit, 10) : 25;

    const filter = {};
    if (req.access.scope === 'own') filter.adminId = req.user.id;
    else if (req.query.adminId) filter.adminId = String(req.query.adminId);

    if (req.query.action) {
      const a = String(req.query.action);
      // "user.*" matches every action that starts with "user."
      filter.action = a.endsWith('.*') ? { $regex: `^${escapeRegex(a.slice(0, -1))}` } : a;
    }
    if (req.query.targetType) filter.targetType = String(req.query.targetType);
    if (req.query.result === 'success' || req.query.result === 'failure') filter.result = req.query.result;

    const from = req.query.from && new Date(req.query.from);
    const to = req.query.to && new Date(req.query.to);
    if ((from && isNaN(from)) || (to && isNaN(to))) throw httpError(400, 'VALIDATION_ERROR', 'from and to must be valid dates');
    if (from || to) filter.time = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    const [rows, total] = await Promise.all([
      AuditLog.find(filter).sort({ time: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ data: rows.map(toItem), meta: { page, limit, total, updatedAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});

// GET /admin/audit/:id
router.get('/:id', requirePermission('audit_log', 'view'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'NOT_FOUND', 'Audit entry not found');
    const d = await AuditLog.findById(req.params.id).lean();
    if (!d || (req.access.scope === 'own' && d.adminId !== req.user.id)) throw httpError(404, 'NOT_FOUND', 'Audit entry not found');
    res.json({ data: toItem(d) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
