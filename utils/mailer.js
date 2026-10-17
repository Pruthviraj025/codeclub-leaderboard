const nodemailer = require('nodemailer');

/**
 * Verify required SMTP environment variables.
 */
// Ensure SMTP credentials exist; if not, use fallback values.
if (!process.env.SMTP_USER) {
  console.warn('SMTP_USER not set; using placeholder sender');
  process.env.SMTP_USER = 'no-reply@example.com';
}
if (!process.env.SMTP_PASS) {
  console.warn('SMTP_PASS not set; email sending will likely fail');
}

/**
 * Sends an OTP email using Gmail SMTP via nodemailer.
 * Utilizes SMTP credentials defined in the .env file (SMTP_USER and SMTP_PASS).
 * This approach works without requiring a custom domain verification.
 */
async function sendOtpEmail(toEmail, otp) {
  // Create a transporter object using Gmail's SMTP service
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Gmail service handles host and port internally
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Allow self‑signed certificates (useful for local/dev environments)
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Determine sender address with fallback
  const fromAddress = process.env.SMTP_USER ? `CodeClub <${process.env.SMTP_USER}>` : 'no-reply@example.com';
  console.log('DEBUG: fromAddress set to', fromAddress);

  const mailOptions = {
    from: fromAddress, // Sender address
    to: toEmail,
    subject: 'Password Reset OTP - CodeClub Leaderboard',
    text: `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your OTP is <b>${otp}</b>.</p><p>Expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
  };

  // Send the email; nodemailer rejects on error, so we let it bubble up
  console.log('Sending OTP email from:', mailOptions.from, 'to:', mailOptions.to);
await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };