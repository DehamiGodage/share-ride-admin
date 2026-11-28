/*
  TESTS FOR THE USERS LIST (GET /admin/users, P04)

  Run with:   npm test

  What these tests prove:
    - Privacy:     email and mobile are masked, and secret fields never reach the browser.
    - Filters:     tabs work, unknown values are ignored, search text is made safe, bad dates are refused.
    - Sorting:     only allowed fields can be sorted on.
    - The route:   paging works, the response has the team's format, and roles are checked.

  These tests do NOT need a real database. Where the route would ask MongoDB for users,
  we replace that call with a fake (a "mock") that returns the data we choose. So the tests
  are fast, work on any computer, and never touch real or test users.
*/

// Vitest is the test tool (npm test runs it).
//   describe = a group of tests, it = one test, expect = check a result,
//   vi = tools for fakes/mocks, beforeEach/afterEach = run before/after every test.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// supertest sends pretend HTTP requests to our Express app, without starting a real server.
import request from 'supertest';
// The whole backend app (routes, permission checks, error handler)
import app from '../src/app.js';
// The User model, so we can replace its database calls with fakes
import { User, USER_PUBLIC_FIELDS } from '../src/modules/users/users.model.js';
// The helper functions exported from the route file, tested one by one
import { buildFilter, parseSort, toListItem } from '../src/modules/users/users.routes.js';

// A FAKE user record, as the database COULD return it, INCLUDING secret fields
// (passwordHash, resetOtpHash). The tests check these secrets never reach the response.
// All values are invented; never put real user data in tests.
const record = {
  _id: '6650a1b2c3d4e5f601234567',
  name: 'Nimal Perera',
  email: 'nimal.perera.1@example.com',
  mobile: '+94791000000',
  role: 'driver',
  status: 'active',
  emailVerified: true,
  authProvider: 'local',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  version: 2,
  passwordHash: '$2b$12$secret', // must NEVER appear in a response
  resetOtpHash: 'secret-otp',    // must NEVER appear in a response
};

/*
  fakeFind: replaces the real database query with a fake one.

  The route calls:  User.find(filter).select(...).sort(...).skip(...).limit(...).lean()
  Each step returns the same "chain" object so the next step can be called on it,
  and the last step (.lean()) gives back the rows we chose.
  vi.fn() makes a "spy" function that remembers how it was called, so a test can check,
  for example, that .select() was called with the safe field list.
*/
function fakeFind(rows) {
  const chain = { select: vi.fn(), sort: vi.fn(), skip: vi.fn(), limit: vi.fn(), lean: vi.fn().mockResolvedValue(rows) };
  // select, sort, skip and limit each return the chain itself
  ['select', 'sort', 'skip', 'limit'].forEach((m) => chain[m].mockReturnValue(chain));
  // When the route calls User.find(...), give it our fake chain instead of the database
  vi.spyOn(User, 'find').mockReturnValue(chain);
  // When the route counts users, answer with the number of fake rows
  vi.spyOn(User, 'countDocuments').mockResolvedValue(rows.length);
  return chain;
}

// Before EVERY test: pretend we're in test mode with the development login skip switched on,
// so requests are treated as a signed-in admin. The role can be changed with the x-dev-role header.
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DEV_BYPASS_AUTH', 'true');
});

// After EVERY test: remove the fakes and settings, so one test can't affect the next.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- Privacy
describe('toListItem (privacy)', () => {
  it('masks email and mobile and never includes secret fields', () => {
    const item = toListItem(record);
    // Contact details are masked
    expect(item.email).toBe('n***@example.com');
    expect(item.mobile).toBe('+94 79 *** 0000');
    // Secret fields are not in the result at all
    expect(item).not.toHaveProperty('passwordHash');
    expect(item).not.toHaveProperty('resetOtpHash');
    // Extra safety net: the word "secret" (only in the secret values) appears nowhere
    expect(JSON.stringify(item)).not.toContain('secret');
  });
});

// ---------------------------------------------------------------- Filters and sorting
describe('buildFilter and parseSort', () => {
  // A fixed "today", so the "new" tab gives the same answer whenever the test runs
  const now = Date.parse('2026-11-28T00:00:00Z');

  it('applies tabs', () => {
    expect(buildFilter({ tab: 'suspended' }, now)).toEqual({ status: 'suspended' });
    expect(buildFilter({ tab: 'drivers' }, now)).toEqual({ role: 'driver' });
    // "new" = joined on or after 7 days before "today"
    expect(buildFilter({ tab: 'new' }, now).createdAt.$gte).toEqual(new Date('2026-11-21T00:00:00Z'));
  });

  it('ignores unknown filter values', () => {
    // None of these values are allowed, so the filter stays empty (no surprise database commands)
    expect(buildFilter({ role: 'admin', status: 'deleted', gender: 'x', tab: 'weird' }, now)).toEqual({});
  });

  it('escapes search text so it cannot act as a pattern', () => {
    // ".*" would normally mean "match anything". After escaping it only matches the literal text ".*"
    expect(buildFilter({ q: 'a.*' }, now).$or[0].name.$regex).toBe('a\\.\\*');
  });

  it('rejects bad dates', () => {
    // "yesterday" is not a date in YYYY-MM-DD form, so buildFilter must throw an error
    expect(() => buildFilter({ joinedFrom: 'yesterday' }, now)).toThrow(/valid dates/);
  });

  it('sorts only on allowed fields', () => {
    expect(parseSort('name:asc')).toEqual({ name: 1 });
    // Sorting by a secret field is refused: it falls back to newest first
    expect(parseSort('passwordHash:asc')).toEqual({ createdAt: -1 });
    // No sort given: newest first
    expect(parseSort(undefined)).toEqual({ createdAt: -1 });
  });
});

// ---------------------------------------------------------------- The route itself
describe('GET /admin/users', () => {
  it('returns masked users with paging meta and tab counts', async () => {
    const chain = fakeFind([record]);
    // Ask for page 2 with 50 rows per page
    const res = await request(app).get('/admin/users?limit=50&page=2');

    expect(res.status).toBe(200);
    // The query asked the database for the safe field list only
    expect(chain.select).toHaveBeenCalledWith(USER_PUBLIC_FIELDS);
    // Page 2 with 50 per page skips the first 50 users
    expect(chain.skip).toHaveBeenCalledWith(50);
    // The user came back masked, with roles as a list
    expect(res.body.data[0]).toMatchObject({ name: 'Nimal Perera', email: 'n***@example.com', roles: ['driver'] });
    // Even though the fake record HAD a passwordHash, the response doesn't
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    // Paging info in the team's format
    expect(res.body.meta).toMatchObject({ page: 2, limit: 50, total: 1 });
    // One count per tab, in this order
    expect(Object.keys(res.body.meta.counts)).toEqual(['all', 'passengers', 'drivers', 'suspended', 'new']);
  });

  it('falls back to 25 rows for an unsupported limit', async () => {
    const chain = fakeFind([]);
    // Someone asks for 9999 rows; the route must cap it at the default 25
    await request(app).get('/admin/users?limit=9999');
    expect(chain.limit).toHaveBeenCalledWith(25);
  });

  it('returns 400 for a bad date', async () => {
    fakeFind([]);
    const res = await request(app).get('/admin/users?joinedFrom=notadate');
    // 400 = the request was wrong, in the team's standard error format
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses the Analyst role (no access to users)', async () => {
    // x-dev-role switches the pretend admin's role (development/test only)
    const res = await request(app).get('/admin/users').set('x-dev-role', 'analyst');
    // 403 = signed in, but this role is not allowed
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows the Safety role to view', async () => {
    fakeFind([]);
    const res = await request(app).get('/admin/users').set('x-dev-role', 'safety');
    expect(res.status).toBe(200);
  });
});