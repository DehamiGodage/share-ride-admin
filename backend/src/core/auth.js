import { verifyAccess } from './tokens.js';
import { httpError } from './httpError.js';
import Admin from '../modules/admins/admin.model.js';
import Session from '../modules/auth/session.model.js';
async function authenticate(req, res, next) {
  try {
    const header = req.header('authorization') || '';
    if (!header && process.env.DEV_BYPASS_AUTH === 'true' && ['development','test'].includes(process.env.NODE_ENV)) {
      const role = req.header('x-dev-role') || 'super_admin';
      if (!['super_admin','operations','safety','analyst'].includes(role)) return next(httpError(400,'VALIDATION_ERROR','Invalid development role.'));
      req.user = { id:'USR-0001', name:'Dev Admin', email:'dev@shareride.lk', role };
      return next();
    }
    const deny = () => httpError(401,'UNAUTHENTICATED','Please sign in again.');
    if (!header.startsWith('Bearer ')) return next(deny());
    let p;
    try { p = verifyAccess(header.slice(7)); } catch { return next(deny()); }
    const now = new Date();
    const admin = await Admin.findOne({ _id:p.sub, status:'active' });
    if (!admin || !admin.twoFactor.enabled) return next(deny());
    const session = await Session.findOneAndUpdate({ _id:p.sid, adminId:p.sub, revokedAt:null, expiresAt:{$gt:now}, absoluteExpiresAt:{$gt:now} }, { $set:{lastSeenAt:now, expiresAt:new Date(Date.now()+30*60000)} });
    if (!session) return next(deny());
    req.user = { id:String(admin._id), name:admin.name, email:admin.email, role:admin.role, sessionId:p.sid };
    next();
  } catch (err) { next(err); }
}
export { authenticate };
