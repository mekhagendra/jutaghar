import crypto from 'crypto';
import nodemailer from 'nodemailer';

let transporter;

function getOtpExpiryMs() {
  const minutes = Number(process.env.OTP_EXPIRE_MINUTES || 10);
  return Math.max(1, minutes) * 60 * 1000;
}

function getFromAddress() {
  const configured = process.env.SMTP_FROM?.trim();

  if (!configured) {
    return process.env.SMTP_USER || 'no-reply@jutaghar.local';
  }

  if (configured.includes('<') && !configured.includes('>')) {
    return process.env.SMTP_USER || 'no-reply@jutaghar.local';
  }

  return configured;
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  return transporter;
}

export function generateOtp() {
  // crypto.randomInt upper bound is exclusive, so 100000–999999 = exactly 6 digits
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export function isOtpExpired(otpExpiresAt) {
  return !otpExpiresAt || new Date(otpExpiresAt).getTime() < Date.now();
}

export function getOtpExpiryDate() {
  return new Date(Date.now() + getOtpExpiryMs());
}

export async function sendOtpEmail({ to, subject, purpose, otp }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD.');
  }

  const expiryMinutes = Number(process.env.OTP_EXPIRE_MINUTES || 10);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">${subject}</h2>
      <p style="margin-top: 0; color: #555;">Use this one-time password to complete ${purpose}.</p>
      <div style="font-size: 32px; letter-spacing: 6px; font-weight: bold; margin: 24px 0; color: #111;">${otp}</div>
      <p style="color: #555;">This OTP expires in ${expiryMinutes} minutes.</p>
      <p style="color: #777; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: getFromAddress(),
    to,
    subject,
    html
  });
}
