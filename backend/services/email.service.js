// services/email.service.js
//
// Single email utility for the whole app. Switches between Gmail and Mailtrap
// via EMAIL_PROVIDER, exposes one sendMail() primitive, and a set of
// pre-built template functions used by the controllers.
//
// ── ENV VARS ─────────────────────────────────────────────────────────────────
//
//   EMAIL_PROVIDER        'gmail' | 'mailtrap'   (default: 'gmail')
//   EMAIL_FROM_NAME        e.g. "Celcium360 Solutions"
//   EMAIL_FROM_ADDRESS      address shown in the "from" field
//
//   # Gmail (App Password required — NOT your normal Gmail password):
//   GMAIL_USER             your@gmail.com
//   GMAIL_APP_PASSWORD     16-char app password from
//                           https://myaccount.google.com/apppasswords
//
//   # Mailtrap (sending — use "Sending Domains", not the testing inbox, for prod):
//   MAILTRAP_HOST           e.g. live.smtp.mailtrap.io
//   MAILTRAP_PORT           587
//   MAILTRAP_USER
//   MAILTRAP_PASS
//
//   CLIENT_URL              e.g. https://celcium360solutions.com  (used to build links)
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const nodemailer = require('nodemailer');

const PROVIDER   = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
const FROM_NAME   = process.env.EMAIL_FROM_NAME    || 'Celcium360 Solutions';
const FROM_ADDR    = process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER || process.env.MAILTRAP_USER;
const CLIENT_URL   = (process.env.CLIENT_URL || 'https://celcium360solutions.com').replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────────────────────
//  Transporter (built once, reused)
// ─────────────────────────────────────────────────────────────────────────────

function buildTransport() {
  if (PROVIDER === 'mailtrap') {
    return nodemailer.createTransport({
      host:   process.env.MAILTRAP_HOST || 'live.smtp.mailtrap.io',
      port:   Number(process.env.MAILTRAP_PORT) || 587,
      secure: false, // Mailtrap sending uses STARTTLS on 587, not implicit TLS
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  // Default: Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

let _transporter = null;
function getTransporter() {
  if (!_transporter) _transporter = buildTransport();
  return _transporter;
}

// Optional: call this once at boot (e.g. in server.js) to fail loudly on bad creds
// instead of failing silently on the first real email.
async function verifyEmailConfig() {
  try {
    await getTransporter().verify();
    console.log(`✅ Email service ready (provider: ${PROVIDER})`);
    return true;
  } catch (err) {
    console.error(`❌ Email service failed to verify (provider: ${PROVIDER}):`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Core send primitive — never throws, returns true/false
// ─────────────────────────────────────────────────────────────────────────────

async function sendMail({ to, subject, html, text }) {
  if (!to || !subject || !html) {
    console.warn('[email.service] sendMail called with missing to/subject/html');
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });
    console.log(`[email.service] Sent "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error(`[email.service] Failed to send "${subject}" → ${to}:`, err.message);
    return false;
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared HTML shell — keeps every template visually consistent
// ─────────────────────────────────────────────────────────────────────────────

function layout({ heading, bodyHtml, footerNote }) {
  return `
  <div style="background:#f4f5f7; padding:32px 16px; font-family:Segoe UI, Arial, sans-serif;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
      <div style="background:#0f172a; padding:24px 32px;">
        <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.3px;">Celcium360 Solutions</span>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px; color:#0f172a; font-size:20px;">${heading}</h2>
        <div style="color:#334155; font-size:15px; line-height:1.6;">
          ${bodyHtml}
        </div>
      </div>
      <div style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e5e7eb;">
        <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5;">
          ${footerNote || 'This is an automated message — please do not reply directly to this email.'}
        </p>
      </div>
    </div>
  </div>`;
}

function button(url, label) {
  return `
    <div style="text-align:center; margin:28px 0;">
      <a href="${url}" target="_blank"
         style="background:#0f172a; color:#ffffff; text-decoration:none; padding:12px 28px;
                border-radius:6px; font-size:15px; font-weight:600; display:inline-block;">
        ${label}
      </a>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATE: Registration received
// ─────────────────────────────────────────────────────────────────────────────

async function sendRegistrationConfirmation({ to, fullName, registrationId }) {
  const html = layout({
    heading: 'Registration Received ✅',
    bodyHtml: `
      <p>Dear ${escapeHtml(fullName)},</p>
      <p>Thanks for registering with Celcium360. Your application has been received and is currently <strong>under review</strong>.</p>
      <p style="background:#f1f5f9; border-radius:6px; padding:12px 16px; font-family:monospace; font-size:14px;">
        Registration ID: <strong>${escapeHtml(registrationId)}</strong>
      </p>
      <p>We'll email you as soon as your application has been processed. Keep your Registration ID handy in case you need to contact support.</p>
    `,
  });
  return sendMail({ to, subject: `Registration Received — ${registrationId}`, html });
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATE: Application status update (approved / rejected)
// ─────────────────────────────────────────────────────────────────────────────

async function sendStatusUpdate({ to, fullName, registrationId, status, rejectionReason }) {
  const approved = status === 'approved';

  const html = layout({
    heading: approved ? 'Application Approved 🎉' : 'Application Update',
    bodyHtml: approved
      ? `
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>Congratulations! Your application (<strong>${escapeHtml(registrationId)}</strong>) has been <strong>approved</strong>.</p>
        <p>You can now log in to the student portal to continue.</p>
        ${button(`${CLIENT_URL}/login`, 'Log In to Student Portal')}
      `
      : `
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>We've reviewed your application (<strong>${escapeHtml(registrationId)}</strong>) and unfortunately it was not approved at this time.</p>
        ${rejectionReason ? `<p style="background:#fef2f2; border-left:3px solid #ef4444; padding:10px 14px; border-radius:4px;"><strong>Reason:</strong> ${escapeHtml(rejectionReason)}</p>` : ''}
        <p>If you believe this is a mistake or have questions, please contact our support team.</p>
      `,
  });

  return sendMail({
    to,
    subject: `Application ${approved ? 'Approved' : 'Update'} — ${registrationId}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATE: Forgot password — reset link
// ─────────────────────────────────────────────────────────────────────────────

async function sendPasswordResetEmail({ to, fullName, resetUrl, expiresInMinutes = 30 }) {
  const html = layout({
    heading: 'Reset Your Password',
    bodyHtml: `
      <p>Dear ${escapeHtml(fullName || 'Student')},</p>
      <p>We received a request to reset the password for your Celcium360 account. Click the button below to choose a new password.</p>
      ${button(resetUrl, 'Reset Password')}
      <p style="font-size:13px; color:#64748b;">This link expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
      <p style="font-size:12px; color:#94a3b8; word-break:break-all;">If the button doesn't work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
    `,
    footerNote: 'For your security, never share this link with anyone.',
  });

  return sendMail({ to, subject: 'Reset Your Celcium360 Password', html });
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATE: Password reset — success confirmation
// ─────────────────────────────────────────────────────────────────────────────

async function sendPasswordResetSuccess({ to, fullName }) {
  const html = layout({
    heading: 'Password Changed',
    bodyHtml: `
      <p>Dear ${escapeHtml(fullName || 'Student')},</p>
      <p>This confirms that your Celcium360 account password was successfully changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
      ${button(`${CLIENT_URL}/login`, 'Log In')}
    `,
  });

  return sendMail({ to, subject: 'Your Celcium360 Password Was Changed', html });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Small helper — escape user-supplied strings before interpolating into HTML
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  verifyEmailConfig,
  sendMail,
  sendRegistrationConfirmation,
  sendStatusUpdate,
  sendPasswordResetEmail,
  sendPasswordResetSuccess,
};