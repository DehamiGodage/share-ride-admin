// Hides private contact data in lists. Show the full value only through
// the audited "reveal" flow (added on day 3).

function maskEmail(email = '') {
  if (!email.includes('@')) return '***';
  return email.replace(/^(.).*(@.*)$/, '$1***$2'); // d***@shareride.lk
}

function maskMobile(mobile = '') {
  const s = String(mobile).replace(/\s/g, '');
  if (s.length < 10) return '*** ' + s.slice(-4);
  return `${s.slice(0, 3)} ${s.slice(3, 5)} *** ${s.slice(-4)}`; // +94 77 *** 4567
}

export { maskEmail, maskMobile };