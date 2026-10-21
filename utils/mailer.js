const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY && process.env.RESEND_FROM
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const smtp = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
      },
    })
  : null;

console.log('Mailer: resend', resend ? 'on' : 'off', '| smtp', smtp ? 'on' : 'off');

const SUBJECT = 'Password Reset OTP - CodeClub Leaderboard';
const textBody = otp =>
  `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`;
const htmlBody = otp =>
  `<p>Your OTP is <b>${otp}</b>.</p><p>Expires in 10 minutes. If you didn't request this, ignore this email.</p>`;

async function sendOtpEmail(toEmail, otp) {
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: toEmail,
        subject: SUBJECT,
        text: textBody(otp),
        html: htmlBody(otp),
      });
      if (!error) {
        console.log('OTP email sent via Resend:', data && data.id);
        return;
      }
      console.error('Resend rejected:', error.name, error.message);
    } catch (err) {
      console.error('Resend threw:', err.message);
    }
  }

  if (smtp) {
    const info = await smtp.sendMail({
      from: `CodeClub <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: SUBJECT,
      text: textBody(otp),
      html: htmlBody(otp),
    });
    console.log('OTP email sent via SMTP:', info.messageId);
    return;
  }

  throw new Error('No mail transport configured or all transports failed');
}

module.exports = { sendOtpEmail };