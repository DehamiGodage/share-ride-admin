import express from 'express';
import { permissionsFor } from '../core/permissions.js';
import auditRoutes from './audit/audit.routes.js';
import usersRoutes from './users/users.routes.js';

const router = express.Router();

// Who am I, and what may my role do? The frontend uses this to show only allowed menu groups.
// GET /admin/me
router.get('/me', (req, res) =>
  res.json({ user: req.user, permissions: permissionsFor(req.user.role) })
);

router.use('/audit', auditRoutes);
router.use('/users', usersRoutes);

// Each member adds ONE line for their own module, for example:
// import usersRoutes from './users/users.routes.js';
// router.use('/users', usersRoutes);

export default router;
