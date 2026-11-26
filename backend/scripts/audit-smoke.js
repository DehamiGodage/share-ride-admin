// Run once against YOUR database to confirm the audit log really works:
//   cd backend
//   node scripts/audit-smoke.js
// Needs MONGO_URL in backend/.env. It writes ONE entry (action config.update, target "smoke-test").
// Entries cannot be deleted through the app. To remove it, delete it in MongoDB Compass or mongosh.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const AuditLog = require('../src/modules/audit/audit.model');
const { auditLog } = require('../src/core/audit');

(async () => {
  if (!(await connectDB())) {
    console.log('Set MONGO_URL in backend/.env first.');
    process.exit(1);
  }
  const req = { ip: '127.0.0.1', get: () => 'smoke-test', user: { id: 'USR-0001', name: 'Dev Admin', role: 'super_admin' } };

  const saved = await auditLog({ req, action: 'config.update', targetType: 'setting', targetId: 'smoke-test', reason: 'Smoke test', before: { v: 1 }, after: { v: 2 } });
  console.log(saved ? `PASS  saved entry ${saved._id}` : 'FAIL  entry was not saved');
  if (!saved) return process.exit(1);

  const found = await AuditLog.findById(saved._id).lean();
  console.log(found && found.reason === 'Smoke test' ? 'PASS  read it back' : 'FAIL  could not read it back');

  const attempts = {
    'update': () => AuditLog.updateOne({ _id: saved._id }, { $set: { reason: 'changed' } }),
    'delete': () => AuditLog.deleteOne({ _id: saved._id }),
  };
  for (const [name, run] of Object.entries(attempts)) {
    try {
      await run();
      console.log(`FAIL  ${name} was allowed`);
    } catch (e) {
      console.log(`PASS  ${name} blocked (${e.message})`);
    }
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('FAIL ', e.message);
  process.exit(1);
});
