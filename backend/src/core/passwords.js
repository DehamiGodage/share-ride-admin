const bcrypt = require('bcryptjs');

const MIN_LENGTH = 12;
const hashPassword = (plain) => bcrypt.hash(plain, 12);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Compared against when the email does not exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('timing-dummy-password', 12);

// Returns a problem message, or null if the password is acceptable (design document, P02: 12+ characters).
function checkPolicy(password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be 72 UTF-8 bytes or fewer.';
  return null;
}

module.exports = { hashPassword, verifyPassword, checkPolicy, DUMMY_HASH };
