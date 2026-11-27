//  prints the email to the console. Replace with real sending later (reuse email.js from the Identity service).
async function sendMail({ to, subject, text }) {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') throw new Error('Real mail provider required');
  console.log('[mail:stub]', { to, subject, text });
}
module.exports = { sendMail };
