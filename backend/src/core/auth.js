// STUB: replaced by real JWT auth on day 3.
// Treats every request as a logged-in admin.
// To test another role, send the header:  x-dev-role: operations
// Roles: super_admin | operations | safety | analyst

function authenticate(req, res, next) {
  req.user = {
    id: 'USR-0001',
    name: 'Dev Admin',
    email: 'dev@shareride.lk',
    role: req.header('x-dev-role') || 'super_admin',
  };
  next();
}

module.exports = { authenticate };