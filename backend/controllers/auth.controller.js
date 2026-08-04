// controllers/auth.controller.js — Student & Admin Authentication

'use strict';

const Registration = require('../models/Registration');
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcryptjs');
const crypto         = require('crypto');
const emailService   = require('../services/email.service');

const JWT_SECRET  = process.env.JWT_SECRET || 'celcium360_strong_secret_2026';
const JWT_EXPIRES = '7d';

// ─────────────────────────────────────────────────────────────────────────────
//  Helper
// ─────────────────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/student-login
//
//  FIX — status check is now consistent:
//    'pending'  → allowed to log in (student sees a "pending review" state)
//    'approved' → full access
//    'rejected' → blocked with clear message
//
//  If you want to block pending students too, change the condition below and
//  remove the 'pending' branch. Both approaches are commented.
// ─────────────────────────────────────────────────────────────────────────────

exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // FIX: must use .select('+password') — password field has select:false in schema
    const user = await Registration.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // FIX: use model's checkPassword() instance method (defined in Registration.js)
    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // ── Status gate ───────────────────────────────────────────────────────────
    //
    // OPTION A (current): block only rejected; pending students may log in.
    // OPTION B: block pending too — uncomment the block below and remove the
    //           'rejected' only check.
    //
    // OPTION B:
    // if (user.status !== 'approved') {
    //   const msg = user.status === 'rejected'
    //     ? 'Your application was not approved. Please contact support.'
    //     : 'Your account is still under review. Please wait for admin approval.';
    //   return res.status(403).json({ success: false, message: msg });
    // }
    //
    // OPTION A (active):
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your application was not approved. Please contact support.',
      });
    }

    const token = signToken({
      id:             user._id,
      registrationId: user.registrationId,
      email:          user.email,
      role:           'student',
      fullName:       user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      // FIX: return both 'student' and 'user' shapes so Angular service
      // (RegistrationService.login tap) works regardless of which key it reads
      student: {
        id:                   user._id,
        registrationId:       user.registrationId,
        fullName:             user.fullName,
        email:                user.email,
        phone:                user.phone,
        category:             user.category,
        status:               user.status,
        assessmentScore:      user.assessmentScore,
        assessmentTotal:      user.assessmentTotal,
        assessmentPercentage: user.assessmentPercentage,
        assessmentLevel:      user.assessmentLevel,
        submittedAt:          user.submittedAt,
      },
    });

  } catch (error) {
    console.error('[studentLogin]', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/admin-login
//  Simple hard-coded admin check — replace with an Admin model if needed.
// ─────────────────────────────────────────────────────────────────────────────

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const adminEmail    = process.env.ADMIN_EMAIL         || 'admin@celcium360.com';
    // .env uses ADMIN_PASSWORD_HASH (bcrypt) — fall back to plain only in dev
    const adminPassword = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || 'Admin@2026!';

    if (email.toLowerCase().trim() !== adminEmail.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Compare plain or hashed password depending on env setup
    let passwordMatch = false;
    if (adminPassword.startsWith('$2')) {
      // Stored as bcrypt hash
      passwordMatch = await bcrypt.compare(password, adminPassword);
    } else {
      // Plain text (dev only — use a hashed env var in production)
      passwordMatch = password === adminPassword;
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = signToken({ role: 'admin', email: adminEmail });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: { email: adminEmail, role: 'admin' },
    });

  } catch (error) {
    console.error('[adminLogin]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me  (protected — requireAuth middleware must run first)
// ─────────────────────────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  try {
    const user = await Registration.findById(req.user.id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    console.error('[getMe]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/forgot-password
//
//  Always returns the same generic success message whether or not the email
//  exists, to prevent this endpoint from being used to enumerate accounts.
//  Generates a random token, stores only its SHA-256 hash on the user record,
//  and emails the raw token as part of a reset link. The raw token is never
//  persisted — only the hash — mirroring how the password itself is stored.
// ─────────────────────────────────────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await Registration.findOne({ email: email.toLowerCase().trim() });

    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    if (!user) return res.json(genericResponse);

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_URL || 'https://celcium360solutions.com').replace(/\/$/, '');
    const resetUrl  = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    const sent = await emailService.sendPasswordResetEmail({
      to:       user.email,
      fullName: user.fullName,
      resetUrl,
    });

    if (!sent) {
      // Don't leave behind a token the user has no way to redeem
      user.resetPasswordToken   = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(502).json({
        success: false,
        message: 'Could not send reset email. Please try again shortly.',
      });
    }

    return res.json(genericResponse);

  } catch (error) {
    console.error('[forgotPassword]', error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/reset-password
//
//  Body: { email, token, newPassword }
//  Verifies the hashed token matches and hasn't expired, then assigns the new
//  plain-text password — the model's pre-save hook is responsible for hashing
//  it (same pattern as change-password in auth.routes.js).
// ─────────────────────────────────────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and new password are required.',
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await Registration.findOne({
      email:                email.toLowerCase().trim(),
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Assign plain text — pre-save hook in Registration.js hashes it
    user.password             = newPassword;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Fire-and-forget confirmation email — don't block the response on it
    emailService.sendPasswordResetSuccess({ to: user.email, fullName: user.fullName }).catch(() => {});

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });

  } catch (error) {
    console.error('[resetPassword]', error);
    return res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
  }
};