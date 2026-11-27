import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

import mongoose from 'mongoose';
import AuditLog from '../src/modules/audit/audit.model.js';
import { auditLog } from '../src/core/audit.js';
import { revealFields } from '../src/core/reveal.js';
import app from '../src/app.js';

const asAdmin = (role = 'super_admin') => ({ ip: '1.2.3.4', get: () => 'jest', user: { id: 'USR-0001', name: 'Dev Admin', role } });
let readyState = 0;
beforeEach(() => {
  readyState = 0;
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DEV_BYPASS_AUTH', 'true');
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockImplementation(() => readyState);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('audit_logs model is append-only', () => {
  it('validates required fields and result enum', async () => {
    const bad = new AuditLog({ action: 'user.suspend', result: 'maybe' });
    const err = bad.validateSync();
    expect(err.errors.adminId).toBeDefined();
    expect(err.errors.result).toBeDefined();
    const ok = new AuditLog({ adminId: 'USR-1', action: 'user.suspend' });
    expect(ok.validateSync()).toBeUndefined();
    expect(ok.result).toBe('success');
  });
  it.each([
    ['updateOne', () => AuditLog.updateOne({}, { $set: { action: 'x' } })],
    ['updateMany', () => AuditLog.updateMany({}, { $set: { action: 'x' } })],
    ['findOneAndUpdate', () => AuditLog.findOneAndUpdate({}, { $set: { action: 'x' } })],
    ['replaceOne', () => AuditLog.replaceOne({}, { adminId: 'a', action: 'b' })],
    ['deleteOne', () => AuditLog.deleteOne({})],
    ['deleteMany', () => AuditLog.deleteMany({})],
    ['findOneAndDelete', () => AuditLog.findOneAndDelete({})],
  ])('blocks %s', async (_n, run) => {
    await expect(run()).rejects.toThrow(/append-only/);
  });
  it('blocks saving or deleting an existing document', async () => {
    const d = new AuditLog({ adminId: 'USR-1', action: 'user.suspend' });
    d.isNew = false;
    await expect(d.save()).rejects.toThrow(/append-only/);
    await expect(d.deleteOne()).rejects.toThrow(/append-only/);
  });
});

describe('auditLog()', () => {
  it('falls back to console when there is no database and never throws', async () => {
    expect(await auditLog({ req: asAdmin(), action: 'user.suspend', targetType: 'user', targetId: 'USR-1', reason: 'x' })).toBeNull();
    expect(console.log).toHaveBeenCalledWith('[audit:no-db]', expect.objectContaining({ action: 'user.suspend', adminId: 'USR-0001', role: 'super_admin', ip: '1.2.3.4' }));
  });
  it('saves the entry with admin, role, ip when connected', async () => {
    readyState = 1;
    const create = vi.spyOn(AuditLog, 'create').mockResolvedValue({ _id: 'abc' });
    await auditLog({ req: asAdmin('safety'), action: 'user.suspend', targetType: 'user', targetId: 'USR-9', reason: 'No-shows', before: { status: 'active' }, after: { status: 'suspended' } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'USR-0001', adminName: 'Dev Admin', role: 'safety', ip: '1.2.3.4', action: 'user.suspend', targetId: 'USR-9', result: 'success', reason: 'No-shows' }));
  });
  it('supports actor for events with no signed-in admin', async () => {
    readyState = 1;
    const create = vi.spyOn(AuditLog, 'create').mockResolvedValue({});
    await auditLog({ req: { ip: '9.9.9.9' }, actor: { id: 'someone@x.lk' }, action: 'auth.login_failed', result: 'failure' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'someone@x.lk', result: 'failure', ip: '9.9.9.9' }));
  });
  it('warns about unknown actions but still records them', async () => {
    await auditLog({ req: asAdmin(), action: 'user.suspnd' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('unknown action "user.suspnd"'));
  });
  it('swallows save failures by default, throws 503 when strict', async () => {
    readyState = 1;
    vi.spyOn(AuditLog, 'create').mockRejectedValue(new Error('db down'));
    expect(await auditLog({ req: asAdmin(), action: 'user.suspend' })).toBeNull();
    await expect(auditLog({ req: asAdmin(), action: 'user.reveal_contact', strict: true })).rejects.toMatchObject({ status: 503, code: 'AUDIT_UNAVAILABLE' });
  });
  it('strict without a database: fine in development, blocked in production', async () => {
    await expect(auditLog({ req: asAdmin(), action: 'user.reveal_contact', strict: true })).resolves.toBeNull();
    process.env.NODE_ENV = 'production';
    await expect(auditLog({ req: asAdmin(), action: 'user.reveal_contact', strict: true })).rejects.toMatchObject({ status: 503 });
  });
});

describe('revealFields()', () => {
  const record = { email: 'dilani@gmail.com', mobile: '+94771234567', nic: '199012345678', secret: 'nope' };
  const base = { targetType: 'user', targetId: 'USR-1', record, area: 'users', level: 'full' };

  it('refuses a role without permission', async () => {
    await expect(revealFields({ ...base, req: asAdmin('analyst'), fields: ['email'], reason: 'Support call' })).rejects.toMatchObject({ status: 403 });
    await expect(revealFields({ ...base, req: asAdmin('safety'), fields: ['email'], reason: 'Support call' })).rejects.toMatchObject({ status: 403 }); // safety has suspend, not full
  });
  it('requires a real reason and known fields', async () => {
    await expect(revealFields({ ...base, req: asAdmin(), fields: ['email'], reason: 'hi' })).rejects.toMatchObject({ status: 400 });
    await expect(revealFields({ ...base, req: asAdmin(), fields: ['email'] })).rejects.toMatchObject({ status: 400 });
    await expect(revealFields({ ...base, req: asAdmin(), fields: [], reason: 'Support call' })).rejects.toMatchObject({ status: 400 });
    await expect(revealFields({ ...base, req: asAdmin(), fields: ['secret'], reason: 'Support call' })).rejects.toMatchObject({ status: 400 });
  });
  it('audits which fields (never the values), then returns only those fields', async () => {
    readyState = 1;
    const create = vi.spyOn(AuditLog, 'create').mockResolvedValue({});
    const out = await revealFields({ ...base, req: asAdmin(), fields: ['email', 'nic'], reason: ' Verifying driver ' });
    expect(out).toEqual({ email: 'dilani@gmail.com', nic: '199012345678' });
    const saved = create.mock.calls[0][0];
    expect(saved).toMatchObject({ action: 'user.reveal_contact', targetId: 'USR-1', reason: 'Verifying driver', after: { revealed: ['email', 'nic'] } });
    expect(JSON.stringify(saved)).not.toContain('dilani@gmail.com');
    expect(JSON.stringify(saved)).not.toContain('199012345678');
  });
  it('refuses to reveal when the audit entry cannot be saved', async () => {
    readyState = 1;
    vi.spyOn(AuditLog, 'create').mockRejectedValue(new Error('db down'));
    await expect(revealFields({ ...base, req: asAdmin(), fields: ['email'], reason: 'Support call' })).rejects.toMatchObject({ status: 503 });
  });
});

describe('GET /admin/audit', () => {
  const chain = (rows) => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }) }) });
  const row = { _id: '665f1c2e8b3a4f0012345678', time: new Date('2026-11-25T10:00:00Z'), adminId: 'USR-0001', adminName: 'Dev Admin', role: 'super_admin', action: 'user.suspend', targetType: 'user', targetId: 'USR-9', result: 'success', ip: '1.2.3.4', reason: 'No-shows' };

  it('returns { data, meta } in the contract format', async () => {
    const find = vi.spyOn(AuditLog, 'find').mockReturnValue(chain([row]));
    vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(61);
    const res = await request(app).get('/admin/audit?page=2&limit=25&action=user.*&result=success');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id: '665f1c2e8b3a4f0012345678', action: 'user.suspend', reason: 'No-shows', before: null });
    expect(res.body.meta).toMatchObject({ page: 2, limit: 25, total: 61 });
    const filter = find.mock.calls[0][0];
    expect(filter.action).toEqual({ $regex: '^user\\.' });
    expect(filter.result).toBe('success');
    expect(filter.adminId).toBeUndefined(); // super admin sees everyone
  });
  it('operations and safety only see their own actions, even if they ask for another admin', async () => {
    const find = vi.spyOn(AuditLog, 'find').mockReturnValue(chain([]));
    vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(0);
    await request(app).get('/admin/audit?adminId=USR-7777').set('x-dev-role', 'operations');
    expect(find.mock.calls[0][0].adminId).toBe('USR-0001');
  });
  it('analyst gets 403 in the standard error format', async () => {
    const res = await request(app).get('/admin/audit').set('x-dev-role', 'analyst');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
  it('rejects bad dates and limits page size to 25/50/100', async () => {
    const bad = await request(app).get('/admin/audit?from=notadate');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    vi.spyOn(AuditLog, 'find').mockReturnValue(chain([]));
    vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(0);
    const res = await request(app).get('/admin/audit?limit=9999');
    expect(res.body.meta.limit).toBe(25);
  });
  it('detail: 404 for a bad id and for someone else\'s entry when scope is own', async () => {
    const a = await request(app).get('/admin/audit/not-an-id');
    expect(a.status).toBe(404);
    vi.spyOn(AuditLog, 'findById').mockReturnValue({ lean: async () => ({ ...row, adminId: 'USR-5555' }) });
    const b = await request(app).get('/admin/audit/665f1c2e8b3a4f0012345678').set('x-dev-role', 'safety');
    expect(b.status).toBe(404);
    const c = await request(app).get('/admin/audit/665f1c2e8b3a4f0012345678');
    expect(c.status).toBe(200);
    expect(c.body.data.action).toBe('user.suspend');
  });
});

describe('app basics still work', () => {
  it('/health, /admin/me and 404 format', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    const me = await request(app).get('/admin/me').set('x-dev-role', 'analyst');
    expect(me.body.user.role).toBe('analyst');
    expect(me.body.permissions.users).toBeNull();
    const nf = await request(app).get('/nope');
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('NOT_FOUND');
  });
});
