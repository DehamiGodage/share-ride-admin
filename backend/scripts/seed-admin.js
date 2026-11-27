
//Create the initial admin accounts without public registration.

import 'dotenv/config';
import mongoose from 'mongoose';
import otplib from 'otplib';
const { authenticator } = otplib;
import connectDB from '../src/config/db.js';
import { encrypt } from '../src/core/secretBox.js';
import Admin from '../src/modules/admins/admin.model.js';
import { hashPassword, checkPolicy } from '../src/core/passwords.js';
import { newBackupCodes } from '../src/core/tokens.js';

// node scripts/seed-admin.js you@example.com "Your Name" super_admin "a-long-password-12+"
(async () => {
  const [email, name, role = 'super_admin', password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.log('Usage: node scripts/seed-admin.js <email> "<name>" <role> "<password>"');
    process.exit(1);
  }
  const problem = checkPolicy(password);
  if (problem) { console.log(problem); process.exit(1); }
  if (!(await connectDB())) { console.log('Set MONGO_URL in backend/.env first.'); process.exit(1); }

  if (await Admin.findOne({ email: email.toLowerCase() })) {
    console.log('An admin with that email already exists.');
    await mongoose.disconnect();
    return;
  }

  const secret = authenticator.generateSecret();
  const { plain, hashed } = newBackupCodes();
  await Admin.create({
    email, name, role,
    passwordHash: await hashPassword(password),
    twoFactor: { enabled: true, secret: encrypt(secret), backupCodes: hashed.map((hash) => ({ hash })) },
  });

  console.log('\nAdmin created:', email, `(${role})`);
  console.log('\nAuthenticator setup. In Google Authenticator choose "Enter a setup key" and use:');
  console.log('  Key:', secret);
  console.log('\nBackup codes (save them now, they are shown only once):');
  plain.forEach((c) => console.log('  ', c));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
