const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Password Reset OTP - CodeClub Leaderboard',
    text: `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your OTP is <b>${otp}</b>.</p><p>Expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  });
}

module.exports = { sendOtpEmail };
