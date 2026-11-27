import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { decrypt } from '../../core/secretBox.js';
import otplib from 'otplib';
const { authenticator } = otplib;
import Admin from '../admins/admin.model.js';
import Session from './session.model.js';
import { httpError } from '../../core/httpError.js';
import { auditLog } from '../../core/audit.js';
import { permissionsFor } from '../../core/permissions.js';
import { hashPassword, verifyPassword, checkPolicy, DUMMY_HASH } from '../../core/passwords.js';
import {
  ACCESS_SECONDS, sha256, randomToken, signAccess, signChallenge, verifyChallenge, normalizeBackupCode,
} from '../../core/tokens.js';
import { sendMail } from '../../core/mailer.js';

authenticator.options = { window: 1 }; // accept the code from 30 seconds before or after (clock drift)

const router = express.Router();
const limiter = (limit, minutes) => rateLimit({ windowMs: minutes*60000, limit, standardHeaders:true, legacyHeaders:false, handler: (req,res,next) => next(httpError(429,'RATE_LIMITED','Too many requests. Try again later.')) });
router.use('/login', limiter(20,15));
router.use('/2fa', limiter(10,5));
router.use('/forgot-password', limiter(5,15));
router.use('/reset-password', limiter(10,15));
router.use('/refresh', limiter(60,5));
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SECRETS = '+passwordHash +twoFactor.secret +twoFactor.backupCodes +trustedDevices';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;            // locked for 15 minutes
const SESSION_IDLE_MS = 30 * 60 * 1000;    // 30 minutes of inactivity ends the session
const TRUST_MS = 30 * 24 * 60 * 60 * 1000; // "trust this device" lasts 30 days
const RESET_MS = 30 * 60 * 1000;           // reset link lasts 30 minutes

const isLocked = (a) => a.lockedUntil && a.lockedUntil > new Date();
const publicAdmin = (a) => ({ id: String(a._id), name: a.name, email: a.email, role: a.role, twoFactorEnabled: a.twoFactor?.enabled === true });

async function registerFailure(admin) {
  const now = new Date();
  const updated = await Admin.findOneAndUpdate({ _id:admin._id, $or:[{lockedUntil:null},{lockedUntil:{$lte:now}}] }, [
    {$set:{failedAttempts:{$add:[{$ifNull:['$failedAttempts',0]},1]}}},
    {$set:{lockedUntil:{$cond:[{$gte:['$failedAttempts',MAX_ATTEMPTS]},new Date(Date.now()+LOCK_MS),'$lockedUntil']},failedAttempts:{$cond:[{$gte:['$failedAttempts',MAX_ATTEMPTS]},0,'$failedAttempts']}}}
  ], {new:true});
  return !updated || isLocked(updated);
}

async function finishLogin(req, res, admin, extra = {}) {
  const refreshToken = randomToken();
  const session = await Session.create({
    adminId: String(admin._id),
    refreshHash: sha256(refreshToken),
    userAgent: req.get('user-agent'),
    ip: req.ip,
    expiresAt: new Date(Date.now() + SESSION_IDLE_MS),
    absoluteExpiresAt: new Date(Date.now()+8*60*60000),
  });
  admin.failedAttempts = 0;
  admin.lockedUntil = undefined;
  admin.lastLoginAt = new Date();
  await admin.save();

  await auditLog({ req, actor: { id: String(admin._id), name: admin.name, role: admin.role }, action: 'auth.login' });
  res.json({
    data: {
      accessToken: signAccess(admin, session.id),
      refreshToken,
      expiresIn: ACCESS_SECONDS,
      ...extra,
      user: publicAdmin(admin),
      permissions: permissionsFor(admin.role),
    },
  });
}

// POST /auth/login   { email, password, deviceToken? }
router.post('/login', wrap(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw httpError(400, 'VALIDATION_ERROR', 'Email and password are required.');

  const admin = await Admin.findOne({ email }).select(SECRETS);

  if (admin && isLocked(admin)) {
    await auditLog({ req, actor: { id: email }, action: 'auth.login_failed', result: 'failure', reason: 'Account locked' });
    throw httpError(423, 'LOCKED', 'Too many failed attempts. Try again in 15 minutes.', { lockedUntil: admin.lockedUntil });
  }

  // Always run the password check, so a wrong email takes as long as a wrong password.
  const passwordOk = await verifyPassword(Buffer.byteLength(password,'utf8') <= 72 ? password : 'invalid-too-long', admin?.passwordHash || DUMMY_HASH) && Buffer.byteLength(password,'utf8') <= 72;

  if (!admin || !passwordOk || admin.status !== 'active') {
    const locked = admin && await registerFailure(admin);
    const why = !admin ? 'Unknown email' : !passwordOk ? 'Wrong password' : 'Deactivated account';
    await auditLog({ req, actor: { id: email }, action: 'auth.login_failed', result: 'failure', reason: why });
    if (locked) throw httpError(423,'LOCKED','Too many failed attempts. Try again in 15 minutes.');
    throw httpError(401, 'UNAUTHENTICATED', 'Email or password is incorrect.'); // never says which one
  }

  if (!admin.twoFactor.enabled) {
    throw httpError(403, 'TWO_FACTOR_REQUIRED', '2-step verification is not set up for this account. Ask a Super Admin.');
  }

  // Trusted device: skip the code for 30 days
  const deviceToken = String(body.deviceToken || '');
  const trusted = deviceToken && admin.trustedDevices.some((d) => d.hash === sha256(deviceToken) && d.expiresAt > new Date());
  if (trusted) return finishLogin(req, res, admin);

  const challengeToken = signChallenge(admin);
  await Admin.updateOne({_id:admin._id}, {$set:{challengeHash:sha256(challengeToken)}});
  return res.json({ data: { twoFactorRequired: true, challengeToken } });
}));

// POST /auth/2fa/verify   { challengeToken, code | backupCode, trustDevice? }
router.post('/2fa/verify', wrap(async (req, res) => {
  const body = req.body || {};
  let payload;
  try {
    payload = verifyChallenge(String(body.challengeToken || ''));
  } catch {
    throw httpError(401, 'UNAUTHENTICATED', 'The sign-in step expired. Please start again.');
  }

  const admin = await Admin.findById(payload.sub).select(SECRETS);
  if (!admin || !admin.twoFactor.enabled || admin.status !== 'active') throw httpError(401, 'UNAUTHENTICATED', 'Please sign in again.');
  if (isLocked(admin)) throw httpError(423, 'LOCKED', 'Too many failed attempts. Try again in 15 minutes.', { lockedUntil: admin.lockedUntil });

  let valid = false;
  if (body.code) {
    valid = authenticator.check(String(body.code).replace(/\s/g, ''), decrypt(admin.twoFactor.secret));
  } else if (body.backupCode) {
    const h = sha256(normalizeBackupCode(body.backupCode));
    const entry = admin.twoFactor.backupCodes.find((b) => b.hash === h && !b.usedAt);
    if (entry) {
      // Consumed atomically below.
      valid = true;
    }
  }

  if (!valid) {
    const locked = await registerFailure(admin);
    await auditLog({ req, actor: { id: String(admin._id), name: admin.name, role: admin.role }, action: 'auth.login_failed', result: 'failure', reason: 'Wrong 2-step code' });
    if (locked) throw httpError(423,'LOCKED','Too many failed attempts.');
    throw httpError(401, 'UNAUTHENTICATED', 'The code is incorrect or has expired.');
  }

  const filter = {_id:admin._id, status:'active', 'twoFactor.enabled':true, challengeHash:sha256(body.challengeToken)};
  const update = {$unset:{challengeHash:1}};
  if (body.code) {
    const delta = authenticator.checkDelta(String(body.code).replace(/\s/g,''), decrypt(admin.twoFactor.secret));
    if (delta === null) throw httpError(401,'UNAUTHENTICATED','Code expired.');
    const step = Math.floor(Date.now()/30000)+delta;
    filter.$or = [{lastTotpStep:{$exists:false}},{lastTotpStep:{$lt:step}}];
    update.$set = {lastTotpStep:step};
  } else {
    filter['twoFactor.backupCodes'] = {$elemMatch:{hash:sha256(normalizeBackupCode(body.backupCode)),usedAt:null}};
    update.$set = {'twoFactor.backupCodes.$.usedAt':new Date()};
  }
  if (!(await Admin.findOneAndUpdate(filter,update))) throw httpError(401,'UNAUTHENTICATED','Code or challenge already used.');
  let deviceToken;
  if (body.trustDevice) {
    deviceToken = randomToken();
    admin.trustedDevices = admin.trustedDevices.filter((d) => d.expiresAt > new Date()); // drop expired ones
    admin.trustedDevices.push({ hash: sha256(deviceToken), expiresAt: new Date(Date.now() + TRUST_MS), userAgent: req.get('user-agent') });
  }
  return finishLogin(req, res, admin, deviceToken ? { deviceToken } : {});
}));

// POST /auth/2fa/resend   (authenticator codes are not sent anywhere, so there is nothing to resend)
router.post('/2fa/resend', (req, res) =>
  res.json({ data: { ok: true, message: 'Open your authenticator app for the current code, or use a backup code.' } }));

// POST /auth/refresh   { refreshToken }   -> new tokens, plus the user and permissions (same shape as login)
router.post('/refresh', wrap(async (req, res) => {
  const refreshToken = String((req.body || {}).refreshToken || '');
  const session = refreshToken && await Session.findOne({ refreshHash: sha256(refreshToken) });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.absoluteExpiresAt < new Date()) throw httpError(401, 'UNAUTHENTICATED', 'Your session expired.');

  const admin = await Admin.findById(session.adminId);
  if (!admin || admin.status !== 'active') {
    session.revokedAt = new Date();
    await session.save();
    throw httpError(401, 'UNAUTHENTICATED', 'Your session expired.');
  }

  const next = randomToken(); // the old refresh token stops working
  const rotated = await Session.findOneAndUpdate({_id:session._id,refreshHash:sha256(refreshToken),revokedAt:null,expiresAt:{$gt:new Date()},absoluteExpiresAt:{$gt:new Date()}},{$set:{refreshHash:sha256(next)}});
  if (!rotated) throw httpError(401,'UNAUTHENTICATED','Session expired.');
  res.json({
    data: {
      accessToken: signAccess(admin, session.id),
      refreshToken: next,
      expiresIn: ACCESS_SECONDS,
      user: publicAdmin(admin),
      permissions: permissionsFor(admin.role),
    },
  });
}));

// POST /auth/logout   { refreshToken }
router.post('/logout', wrap(async (req, res) => {
  const refreshToken = String((req.body || {}).refreshToken || '');
  const session = refreshToken && await Session.findOne({ refreshHash: sha256(refreshToken) });
  if (session && !session.revokedAt) {
    session.revokedAt = new Date();
    await session.save();
    const admin = await Admin.findById(session.adminId);
    await auditLog({ req, actor: { id: session.adminId, name: admin?.name, role: admin?.role }, action: 'auth.logout' });
  }
  res.json({ data: { ok: true } });
}));

// POST /auth/forgot-password   { email }   -> always the same answer
router.post('/forgot-password', wrap(async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const admin = email && await Admin.findOne({ email, status: 'active' });
  if (admin) {
    const token = randomToken();
    admin.resetHash = sha256(token);
    admin.resetExpires = new Date(Date.now() + RESET_MS);
    await admin.save();
    await sendMail({
      to: admin.email,
      subject: 'Reset your Share-Ride Admin password',
      text: `Reset link (valid 30 minutes, works once): ${process.env.CLIENT_URL}/reset-password?token=${token}`,
    });
  }
  res.json({ data: { ok: true, message: 'If an account exists, we have sent a reset link.' } });
}));

// POST /auth/reset-password   { token, newPassword }
router.post('/reset-password', wrap(async (req, res) => {
  const body = req.body || {};
  const problem = checkPolicy(body.newPassword);
  if (problem) throw httpError(400, 'VALIDATION_ERROR', problem);

  const admin = await Admin.findOne({ resetHash: sha256(String(body.token || '')), resetExpires: { $gt: new Date() } })
    .select('+resetHash +resetExpires +passwordHash');
  if (!admin) throw httpError(400, 'VALIDATION_ERROR', 'This reset link is invalid or has expired.');

  const passwordHash = await hashPassword(body.newPassword);
  const changed = await Admin.findOneAndUpdate({_id:admin._id,status:'active',resetHash:sha256(String(body.token || '')),resetExpires:{$gt:new Date()}},{$set:{passwordHash,passwordChangedAt:new Date(),failedAttempts:0,trustedDevices:[]},$unset:{resetHash:1,resetExpires:1,lockedUntil:1,challengeHash:1}});
  if (!changed) throw httpError(400,'VALIDATION_ERROR','This reset link is invalid or has expired.');

  await Session.updateMany({ adminId: String(admin._id), revokedAt: null }, { revokedAt: new Date() }); // sign out everywhere
  await auditLog({ req, actor: { id: String(admin._id), name: admin.name, role: admin.role }, action: 'auth.password_reset' });
  res.json({ data: { ok: true } });
}));

export default router;
