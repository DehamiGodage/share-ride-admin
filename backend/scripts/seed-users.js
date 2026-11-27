/*
  Fills the DEVELOPMENT database with fake users for P04 and P05.

    npm run seed:users

  SAFETY
  - Refuses to run unless the database name ends with "_dev".
  - Deletes only records matching the generated test email addresses.
  - Preserves existing database indexes.
  - Emails use example.com, a domain reserved for examples.
  - Never send SMS to the generated mobile numbers.
  - Run only against a dedicated development database.
*/

import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/modules/users/users.model.js';

const COUNT = 40;

const FIRST = {
  male: [
    'Nimal', 'Kasun', 'Saman', 'Ruwan', 'Tharindu',
    'Dilan', 'Chamara', 'Isuru', 'Lahiru', 'Pradeep'
  ],
  female: [
    'Kavindi', 'Nethmi', 'Sanduni', 'Dilini', 'Hiruni',
    'Ishara', 'Tharushi', 'Amaya', 'Nadeesha', 'Sachini'
  ],
};

const LAST = [
  'Perera', 'Silva', 'Fernando', 'Jayasinghe', 'Bandara',
  'Wickramasinghe', 'Rathnayake', 'Herath',
  'Gunawardena', 'Dissanayake'
];

const SUSPEND_REASONS = [
  'Repeated no-shows',
  'Abusive messages to a driver',
  'Fake profile details'
];

const DAY = 24 * 60 * 60 * 1000;

const pick = (list, i) => list[i % list.length];

function fakeUser(i) {
  const gender =
    i % 9 === 0
      ? 'prefer_not_to_say'
      : i % 2 === 0
        ? 'male'
        : 'female';

  const first = pick(
    FIRST[gender === 'female' ? 'female' : 'male'],
    i * 3
  );

  const last = pick(LAST, i * 7);

  const createdAt = new Date(
    Date.now() -
    ((i * 37) % 120) * DAY -
    (i % 24) * 60 * 60 * 1000
  );

  const user = {
    name: `${first} ${last}`,

    email: `${first}.${last}.${i + 1}@example.com`.toLowerCase(),

    mobile: `+9479${String(1000000 + i * 7919).slice(-7)}`,

    authProvider: i % 4 === 0 ? 'google' : 'local',

    role: i % 3 === 0 ? 'driver' : 'passenger',

    gender,

    dateOfBirth: new Date(
      Date.UTC(1975 + (i % 30), i % 12, 1 + (i % 28))
    ),

    profilePhotoUrl: '',

    emailVerified: i % 5 !== 0,

    status: 'active',

    createdAt,

    updatedAt: createdAt,
  };

  // Four suspended users: two permanent and two temporary.
  if (i % 11 === 5) {
    user.status = 'suspended';

    user.suspensionReason = pick(SUSPEND_REASONS, i);

    user.suspendedUntil =
      i % 2 === 0
        ? null
        : new Date(Date.now() + 14 * DAY);
  }

  return user;
}

async function main() {
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set in backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 8000,
    autoIndex: false,
    autoCreate: false,
  });

  const dbName = mongoose.connection.name;

  if (!dbName.endsWith('_dev')) {
    throw new Error(
      `Refusing to seed "${dbName}". Only databases ending with "_dev" may be seeded.`
    );
  }

  const users = Array.from(
    { length: COUNT },
    (_, i) => fakeUser(i)
  );

  // Create required indexes without dropping existing indexes.
  await User.createIndexes();

  // Delete only records matching the generated test emails.
  const seedEmails = users.map((user) => user.email);

  await User.deleteMany({
    email: { $in: seedEmails }
  });

  // Preserve generated timestamps.
  await User.insertMany(users, {
    timestamps: false
  });

  const suspended = users.filter(
    (user) => user.status === 'suspended'
  ).length;

  console.log(
    `[seed] ${users.length} fake users saved in "${dbName}" (${suspended} suspended)`
  );
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());