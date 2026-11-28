/*
  USERS MODULE: ROUTES (P04 Users list)

  This file answers the request the P04 page sends:   GET /admin/users

  The flow for one request:
    1. requirePermission checks the admin's role may view users (Analyst is refused with 403).
    2. buildFilter turns the URL's query string (?tab=...&q=...) into a MongoDB filter.
    3. MongoDB returns one page of users, loading ONLY the safe fields.
    4. toListItem turns each record into a safe object, masking email and mobile.
    5. The response is sent in the team's format: { data: [...], meta: {...} }.

  Example URLs:
    /admin/users                         first 25 users, newest first
    /admin/users?tab=suspended           only suspended users
    /admin/users?q=perera&page=2         search "perera", second page
    /admin/users?sort=name:asc&limit=50  sorted A to Z, 50 per page
*/

// Express builds the web server; Router lets this file define its own group of routes.
import express from 'express';
// Team helpers from core/ (shared by every module)
import { requirePermission } from '../../core/permissions.js'; // role check
import { httpError } from '../../core/httpError.js';            // standard error format
import { maskEmail, maskMobile } from '../../core/mask.js';     // hides private contact data
// Our own model: User is the "users" collection, USER_PUBLIC_FIELDS is the safe field list
import { User, USER_PUBLIC_FIELDS } from './users.model.js';

// A mini router for this module. modules/index.js mounts it at /admin/users,
// so router.get('/') below means GET /admin/users.
const router = express.Router();

// One day in milliseconds (24 h x 60 min x 60 s x 1000 ms). Used for the "new" tab.
const DAY = 24 * 60 * 60 * 1000;

// The tabs on top of the P04 page. Their counts are returned in meta.counts.
const TABS = ['all', 'passengers', 'drivers', 'suspended', 'new'];

// SECURITY: only these fields may be sorted on, so nobody can sort (and so guess values)
// by a hidden field like passwordHash.
// Left side = name the frontend sends, right side = real database field.
// "joinedAt" is the name the frontend uses for createdAt.
const SORTABLE = { name: 'name', joinedAt: 'createdAt', createdAt: 'createdAt', status: 'status' };

// SECURITY: search text is turned into a regular expression (a text pattern) below.
// Characters like . * + ? have special meaning in patterns, so we put a \ in front of each
// to make them match literally. Without this, a search like ".*" would match everything,
// and very complex patterns could slow down the database.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
  toListItem: turns ONE database record into the object sent to the browser.

  PRIVACY: we build a brand-new object, field by field. Anything not listed here
  (for example a password hash or an OTP code) can never reach the browser,
  even if the database returned it. Email and mobile are always masked:
    nimal.perera.1@example.com  ->  n***@example.com
    +94791000000                ->  +94 79 *** 0000
  The full values are only shown through the audited "reveal" flow (Step 6).

  "export" lets the test file (tests/users.test.js) call this function directly.
*/
export function toListItem(u) {
  return {
    id: String(u._id),                        // MongoDB's id, as text
    name: u.name,
    photoUrl: u.profilePhotoUrl || null,      // null = the page shows initials instead
    email: maskEmail(u.email),                // masked
    mobile: maskMobile(u.mobile),             // masked
    roles: [u.role],                          // the contract expects a list: ['driver']
    status: u.status,                         // 'active' or 'suspended'
    suspendedUntil: u.suspendedUntil ?? null, // ?? null = use null if the value is missing
    emailVerified: Boolean(u.emailVerified),  // always true/false, never undefined
    authProvider: u.authProvider,             // 'local' (email + password) or 'google'
    gender: u.gender ?? null,
    joinedAt: u.createdAt,                    // when the account was created
    version: u.version ?? 0,                  // used later to detect two admins editing at once
  };
}

/*
  tabFilter: the extra filter for each tab.
  Example: tab 'suspended' -> { status: 'suspended' } (MongoDB: "where status is suspended")
  "now" is passed in (instead of reading the clock here) so tests can use a fixed date.
*/
export function tabFilter(tab, now = Date.now()) {
  switch (tab) {
    case 'passengers': return { role: 'passenger' };
    case 'drivers': return { role: 'driver' };
    case 'suspended': return { status: 'suspended' };
    // $gte = "greater than or equal": joined in the last 7 days
    case 'new': return { createdAt: { $gte: new Date(now - 7 * DAY) } };
    default: return {}; // 'all' or anything unknown: no extra filter
  }
}

/*
  buildFilter: turns the URL's query string into a MongoDB filter object.

  Example: ?role=driver&q=perera&tab=suspended becomes
    { role: 'driver', status: 'suspended',
      $or: [ { name: /perera/i }, { email: /perera/i }, { mobile: /perera/i } ] }

  SECURITY: every value is checked against a fixed list of allowed values.
  Unknown or empty values are simply ignored, so nobody can send their own
  MongoDB commands through the URL.
*/
export function buildFilter(query, now = Date.now()) {
  const filter = {};

  // Simple filters: only accepted when the value is one we expect
  if (query.role === 'driver' || query.role === 'passenger') filter.role = query.role;
  if (query.status === 'active' || query.status === 'suspended') filter.status = query.status;
  if (['male', 'female', 'prefer_not_to_say'].includes(query.gender)) filter.gender = query.gender;

  // Join date range, from the date pickers (YYYY-MM-DD)
  const from = query.joinedFrom ? new Date(query.joinedFrom) : null;
  const to = query.joinedTo ? new Date(query.joinedTo) : null;
  // isNaN(date) is true for an invalid date such as "yesterday". Answer 400 instead of guessing.
  if ((from && isNaN(from)) || (to && isNaN(to))) {
    throw httpError(400, 'VALIDATION_ERROR', 'joinedFrom and joinedTo must be valid dates (YYYY-MM-DD)');
  }
  // "to = 2026-11-28" should include users who joined any time ON the 28th, so move it to 23:59:59
  if (to) to.setUTCHours(23, 59, 59, 999);
  // $gte = on or after "from", $lte = on or before "to". Only the parts that were given are added.
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  // Search box: one text matched against name, email OR mobile.
  // .trim() removes spaces at the ends; .slice(0, 100) caps very long input.
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  if (q) {
    // $regex = "contains this text", $options 'i' = ignore upper/lower case
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    // $or = match if ANY of these is true
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }

  // Add the tab's filter on top of the others (tabs and filters combine)
  return { ...filter, ...tabFilter(query.tab, now) };
}

/*
  parseSort: turns "name:asc" into MongoDB's sort format { name: 1 }.
  1 = ascending (A to Z, oldest first), -1 = descending (Z to A, newest first).
  Anything not in SORTABLE falls back to newest first.
*/
export function parseSort(sort) {
  const [field, dir] = String(sort || '').split(':'); // "name:asc" -> ['name', 'asc']
  const key = SORTABLE[field];
  if (!key) return { createdAt: -1 }; // unknown field: newest first
  return { [key]: dir === 'asc' ? 1 : -1 };
}

/*
  GET /admin/users   (P04, contract: docs/api-contract.yaml)

  requirePermission('users', 'view') runs first. If the admin's role may not view users,
  it answers 403 FORBIDDEN and this function never runs.
  "async" lets us use "await" to wait for the database.
*/
router.get('/', requirePermission('users', 'view'), async (req, res, next) => {
  try {
    // Paging. parseInt turns the text "2" into the number 2; "|| 1" uses 1 if it isn't a number.
    // Math.max(1, ...) stops page 0 or negative pages.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    // Only 25, 50 or 100 rows per page are allowed (stops someone asking for a million rows).
    const limit = [25, 50, 100].includes(parseInt(req.query.limit, 10)) ? parseInt(req.query.limit, 10) : 25;
    // Read the clock once, so every part of this request uses the same "now".
    const now = Date.now();
    // The filter for the rows on this page (search + filters + current tab)
    const filter = buildFilter(req.query, now);

    // Tab counts: the numbers shown on each tab, e.g. "Suspended 4".
    // They use the same search and filters as the list, but each with its own tab.
    const base = buildFilter({ ...req.query, tab: 'all' }, now);
    const countFor = (tab) => User.countDocuments({ ...base, ...tabFilter(tab, now) });

    // Promise.all runs all the database queries at the same time (faster than one by one)
    // and waits until every one has finished.
    const [rows, total, ...tabCounts] = await Promise.all([
      // 1. The rows for this page
      User.find(filter)
        .select(USER_PUBLIC_FIELDS)       // PRIVACY: load only the safe list of fields
        .sort(parseSort(req.query.sort))  // order
        .skip((page - 1) * limit)         // skip earlier pages (page 2 with limit 25 skips 25)
        .limit(limit)                     // take one page
        .lean(),                          // plain objects (faster; we only read them)
      // 2. How many users match in total (for "26-50 of 120" and the Next button)
      User.countDocuments(filter),
      // 3. One count per tab (5 numbers)
      ...TABS.map(countFor),
    ]);

    // Send the answer in the team's list format: { data: [...], meta: {...} }
    res.json({
      data: rows.map(toListItem), // every record made safe and masked
      meta: {
        page,
        limit,
        total,
        updatedAt: new Date(now).toISOString(), // shown as "Updated at ..." on the page
        // Pair each tab name with its count: { all: 40, passengers: 26, drivers: 14, ... }
        counts: Object.fromEntries(TABS.map((t, i) => [t, tabCounts[i]])),
      },
    });
  } catch (err) {
    // Any error (bad date, database problem) goes to the error handler in app.js,
    // which sends it in the team's standard format: { error: { code, message } }
    next(err);
  }
});

// Lets modules/index.js import this router and mount it at /admin/users
export default router;