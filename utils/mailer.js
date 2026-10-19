const nodemailer = require('nodemailer');

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('SMTP_USER / SMTP_PASS not set; OTP emails will fail');
}

// One shared transporter. Gmail needs an App Password (2FA on), no spaces.
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,            // STARTTLS. Try 465 + secure:true if 587 times out.
  secure: false,
  requireTLS: true,
  family: 4,            // force IPv4, avoids ENETUNREACH on Render
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  },
});

// Log once at boot so Render logs show SMTP state immediately.
transporter.verify()
  .then(() => console.log('SMTP ready'))
  .catch(err => console.error('SMTP verify failed:', err.code, err.message));

async function sendOtpEmail(toEmail, otp) {
  const info = await transporter.sendMail({
    from: `CodeClub <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Password Reset OTP - CodeClub Leaderboard',
    text: `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your OTP is <b>${otp}</b>.</p><p>Expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
  });
  console.log('OTP email sent:', info.messageId);
}

module.exports = { sendOtpEmail };