const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'CodeClub <onboarding@resend.dev>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const smtpUser = process.env.SMTP_USER;
const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('Mailer config:', {
  resend: resend ? 'configured' : 'off',
  smtp: smtpUser && smtpPass ? 'configured' : 'off',
  smtpUser: smtpUser || 'none'
});

const SUBJECT = 'Password Reset OTP - CodeClub Leaderboard';
const textBody = otp =>
  `Your OTP is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`;
const htmlBody = otp =>
  `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #1e293b; border-radius: 8px; background: #0f172a; color: #f8fafc;">
    <h2 style="color: #38bdf8; margin-top: 0;">CodeClub Leaderboard</h2>
    <p style="font-size: 15px; color: #cbd5e1;">Your password reset verification code is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #22c55e; margin: 20px 0; padding: 12px; background: #1e293b; text-align: center; border-radius: 6px;">
      ${otp}
    </div>
    <p style="font-size: 13px; color: #94a3b8;">This code expires in <b>10 minutes</b>. If you did not request a password reset, please ignore this email.</p>
  </div>`;

function createGmailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    family: 4,
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function createSmtpPort465Transport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function createSmtpPort587Transport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4,
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function sendOtpEmail(toEmail, otp) {
  let resendErr = null;
  let smtpErr = null;

  // 1. Try Resend if configured
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: resendFrom,
        to: toEmail,
        subject: SUBJECT,
        text: textBody(otp),
        html: htmlBody(otp),
      });
      if (!error && data?.id) {
        console.log('OTP email sent via Resend to', toEmail, 'id:', data.id);
        return { provider: 'resend', id: data.id };
      }
      resendErr = error ? new Error(error.message) : new Error('Unknown Resend error');
      console.warn('Resend rejected email:', resendErr.message, '- falling back to Gmail SMTP');
    } catch (err) {
      resendErr = err;
      console.warn('Resend request threw:', err.message, '- falling back to Gmail SMTP');
    }
  }

  // 2. Try Gmail SMTP with multiple connection strategies
  if (smtpUser && smtpPass) {
    // Attempt A: service: 'gmail'
    try {
      const transport = createGmailTransport();
      const info = await transport.sendMail({
        from: `CodeClub <${smtpUser}>`,
        to: toEmail,
        subject: SUBJECT,
        text: textBody(otp),
        html: htmlBody(otp),
      });
      console.log('OTP email sent via Gmail service to', toEmail, 'id:', info.messageId);
      return { provider: 'gmail-service', id: info.messageId };
    } catch (errA) {
      console.warn('Gmail service transport failed:', errA.message, '- trying port 465 direct SSL');
      smtpErr = errA;
    }

    // Attempt B: direct Port 465 SSL
    try {
      const transport465 = createSmtpPort465Transport();
      const info = await transport465.sendMail({
        from: `CodeClub <${smtpUser}>`,
        to: toEmail,
        subject: SUBJECT,
        text: textBody(otp),
        html: htmlBody(otp),
      });
      console.log('OTP email sent via SMTP 465 to', toEmail, 'id:', info.messageId);
      return { provider: 'smtp-465', id: info.messageId };
    } catch (errB) {
      console.warn('SMTP 465 direct SSL failed:', errB.message, '- trying port 587 STARTTLS');
      smtpErr = errB;
    }

    // Attempt C: port 587 STARTTLS
    try {
      const transport587 = createSmtpPort587Transport();
      const info = await transport587.sendMail({
        from: `CodeClub <${smtpUser}>`,
        to: toEmail,
        subject: SUBJECT,
        text: textBody(otp),
        html: htmlBody(otp),
      });
      console.log('OTP email sent via SMTP 587 to', toEmail, 'id:', info.messageId);
      return { provider: 'smtp-587', id: info.messageId };
    } catch (errC) {
      console.error('SMTP 587 failed:', errC.message);
      smtpErr = errC;
    }
  }

  const errorDetails = [
    resendErr ? `Resend: ${resendErr.message}` : null,
    smtpErr ? `SMTP: ${smtpErr.message}` : null,
    !resend && (!smtpUser || !smtpPass) ? 'No email credentials configured' : null,
  ].filter(Boolean).join(' | ');

  throw new Error(`Email delivery failed (${errorDetails})`);
}

module.exports = { sendOtpEmail };