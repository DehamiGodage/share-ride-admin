/*
  Fills the DEVELOPMENT database with fake users for P04 and P05.

    npm run seed:users

  SAFETY
  - Refuses to run unless the database name ends with "_dev", so it can never touch
    the real "share_ride" database.
  - Deletes the existing users in that dev database first, then inserts new fake ones.
  - Every value is invented. Emails use example.com, a domain reserved for examples, so no
    real person can receive a message. Never put real customer data in this file.
*/
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/modules/users/users.model');

const COUNT = 40;

const FIRST = {
  male: ['Nimal', 'Kasun', 'Saman', 'Ruwan', 'Tharindu', 'Dilan', 'Chamara', 'Isuru', 'Lahiru', 'Pradeep'],
  female: ['Kavindi', 'Nethmi', 'Sanduni', 'Dilini', 'Hiruni', 'Ishara', 'Tharushi', 'Amaya', 'Nadeesha', 'Sachini'],
};
const LAST = ['Perera', 'Silva', 'Fernando', 'Jayasinghe', 'Bandara', 'Wickramasinghe', 'Rathnayake', 'Herath', 'Gunawardena', 'Dissanayake'];
const SUSPEND_REASONS = ['Repeated no-shows', 'Abusive messages to a driver', 'Fake profile details'];

const DAY = 24 * 60 * 60 * 1000;
const pick = (list, i) => list[i % list.length];

function fakeUser(i) {
  const gender = i % 9 === 0 ? 'prefer_not_to_say' : i % 2 === 0 ? 'male' : 'female';
  const first = pick(FIRST[gender === 'female' ? 'female' : 'male'], i * 3);
  const last = pick(LAST, i * 7);
  const createdAt = new Date(Date.now() - ((i * 37) % 120) * DAY - (i % 24) * 60 * 60 * 1000);

  const user = {
    name: `${first} ${last}`,
    email: `${first}.${last}.${i + 1}@example.com`.toLowerCase(),
    mobile: `+9479${String(1000000 + i * 7919).slice(-7)}`, // fake test numbers, never send SMS to them
    authProvider: i % 4 === 0 ? 'google' : 'local',
    role: i % 3 === 0 ? 'driver' : 'passenger',
    gender,
    dateOfBirth: new Date(Date.UTC(1975 + (i % 30), i % 12, 1 + (i % 28))),
    profilePhotoUrl: '', // no photo; the admin page shows initials instead
    emailVerified: i % 5 !== 0,
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  };

  // A few suspended users: one permanent, the others with an end date
  if (i % 11 === 5) {
    user.status = 'suspended';
    user.suspensionReason = pick(SUSPEND_REASONS, i);
    user.suspendedUntil = i % 2 === 0 ? null : new Date(Date.now() + 14 * DAY);
  }
  return user;
}

async function main() {
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL is not set in backend/.env');
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 8000 });

  const dbName = mongoose.connection.name;
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Refusing to seed "${dbName}". Only databases ending with "_dev" may be seeded.`);
  }

  const users = Array.from({ length: COUNT }, (_, i) => fakeUser(i));
  await User.deleteMany({});
  await User.insertMany(users, { timestamps: false }); // keep our spread-out createdAt dates
  await User.syncIndexes();

  const suspended = users.filter((u) => u.status === 'suspended').length;
  console.log(`[seed] ${users.length} fake users saved in "${dbName}" (${suspended} suspended)`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());