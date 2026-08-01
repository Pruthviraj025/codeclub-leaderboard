const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otp) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM, // e.g. "CodeClub <onboarding@resend.dev>" or your verified domain
    to: toEmail,
    subject: 'Password Reset OTP - CodeClub Leaderboard',
    text: `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your OTP is <b>${otp}</b>.</p><p>Expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message || error}`);
  }
}

module.exports = { sendOtpEmail };