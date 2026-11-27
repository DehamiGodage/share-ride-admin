const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_SECONDS = 15 * 60;

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in backend/.env');
  return process.env.JWT_SECRET;
}

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

// Access token: sent with every request, lives 15 minutes, carries the role.
function signAccess(admin, sessionId) {
  return jwt.sign(
    { typ: 'access', role: admin.role, name: admin.name, email: admin.email, sid: sessionId },
    secret(),
    { subject: String(admin._id), expiresIn: ACCESS_SECONDS, issuer: 'share-ride-admin', audience: 'admin-web' }
  );
}
function verifyAccess(token) {
  const p = jwt.verify(token, secret(), { algorithms: ['HS256'], issuer: 'share-ride-admin', audience: 'admin-web' });
  if (p.typ !== 'access') throw new jwt.JsonWebTokenError('wrong token type');
  return p;
}

// Challenge token: proves the password step passed. Only good for the 2-step screen, 5 minutes.
function signChallenge(admin) {
  return jwt.sign({ typ: '2fa' }, secret(), { subject: String(admin._id), expiresIn: 300, issuer: 'share-ride-admin', audience: 'admin-web', jwtid: randomToken() });
}
function verifyChallenge(token) {
  const p = jwt.verify(token, secret(), { algorithms: ['HS256'], issuer: 'share-ride-admin', audience: 'admin-web' });
  if (p.typ !== '2fa') throw new jwt.JsonWebTokenError('wrong token type');
  return p;
}

// Backup codes: shown once as xxxx-xxxx-xxxx-xxxx, stored only as a hash, each works once.
const normalizeBackupCode = (c) => String(c).toLowerCase().replace(/[^a-f0-9]/g, '');
function newBackupCodes(count = 10) {
  const plain = [];
  const hashed = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(8).toString('hex');
    plain.push(raw.match(/.{4}/g).join('-'));
    hashed.push(sha256(raw));
  }
  return { plain, hashed };
}

module.exports = { ACCESS_SECONDS, sha256, randomToken, signAccess, verifyAccess, signChallenge, verifyChallenge, normalizeBackupCode, newBackupCodes };
