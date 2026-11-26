const express = require('express');
const router = express.Router();
const { permissionsFor } = require('../core/permissions');

// Who am I, and what may my role do? The frontend uses this to show only allowed menu groups.
// GET /admin/me
router.get('/me', (req, res) =>
  res.json({ user: req.user, permissions: permissionsFor(req.user.role) })
);

router.use('/audit', require('./audit/audit.routes'));

// Each member adds ONE line for their own module, for example:
// router.use('/users', require('./users/users.routes'));

module.exports = router;
