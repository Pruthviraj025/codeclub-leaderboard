// Run from backend root:  node testMail.js you@example.com
require('dotenv').config();
const nodemailer = require('nodemailer');

const to = process.argv[2] || process.env.SMTP_USER;
const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
console.log('user set:', !!user, '| pass length:', pass.length, '(Google app password = 16)');

async function attempt(label, opts) {
  const t = nodemailer.createTransport({
    ...opts, family: 4, auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false,
  });
  try {
    await t.verify();
    console.log(`[${label}] verify OK`);
    const info = await t.sendMail({ from: user, to, subject: 'SMTP test', text: 'It works.' });
    console.log(`[${label}] SENT`, info.response);
    return true;
  } catch (e) {
    console.log(`[${label}] FAIL code=${e.code} responseCode=${e.responseCode} msg=${e.message}`);
    return false;
  }
}

(async () => {
  if (await attempt('587 STARTTLS', { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true })) return;
  await attempt('465 SSL', { host: 'smtp.gmail.com', port: 465, secure: true });
})();