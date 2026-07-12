const nodemailer = require('nodemailer');

// Uses Gmail SMTP by default — simplest option for a student project.
// Requires an "App Password" (not your regular Gmail password) since
// Gmail blocks plain password logins from apps. Generate one at:
// https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendMail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: `"CodeClub Leaderboard" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail };
