const mongoose = require('mongoose');

// Append-only: entries can be created and read, never changed or deleted (design document, P22).
const auditLogSchema = new mongoose.Schema(
  {
    time: { type: Date, default: Date.now, index: true },
    adminId: { type: String, required: true, index: true },
    adminName: String,
    role: String,
    ip: String,
    userAgent: String,
    action: { type: String, required: true, index: true },
    targetType: String,
    targetId: { type: String, index: true },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    reason: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  { collection: 'audit_logs', versionKey: false }
);

const BLOCKED = new Error('audit_logs is append-only: entries cannot be changed or deleted');

// Query-style changes (Model.updateOne(...), Model.deleteMany(...), and so on)
[
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete',
].forEach((op) => {
  auditLogSchema.pre(op, { document: false, query: true }, function () {
    throw BLOCKED;
  });
});
// Document-style changes (doc.save() on an existing entry, doc.deleteOne(), doc.updateOne())
auditLogSchema.pre('save', function () {
  if (!this.isNew) throw BLOCKED;
});
['deleteOne', 'updateOne'].forEach((op) => {
  auditLogSchema.pre(op, { document: true, query: false }, function () {
    throw BLOCKED;
  });
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
