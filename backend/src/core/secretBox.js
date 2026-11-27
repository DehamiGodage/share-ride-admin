
import crypto from 'node:crypto';


function key() {  //load and validates encryption key from .env
  const v = process.env.ADMIN_2FA_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(v)) throw new Error('ADMIN_2FA_KEY must be 32 bytes in hex');
  return Buffer.from(v, 'hex');
}
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(value, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString('hex')).join(':');
}
function decrypt(value) {
  const [iv, tag, data] = value.split(':').map(v => Buffer.from(v, 'hex'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}
export { encrypt, decrypt };
