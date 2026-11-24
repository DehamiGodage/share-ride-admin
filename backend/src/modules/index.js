const express = require('express');
const router = express.Router();

// Quick check that the auth stub works: GET /admin/me
router.get('/me', (req, res) => res.json({ user: req.user }));

// Each member adds ONE line for their own module, for example:
// router.use('/users', require('./users/users.routes'));

module.exports = router;