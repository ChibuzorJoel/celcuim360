/**
 * routes/auth.routes.js
 * Student & Admin Authentication
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const Registration = require('../models/Registration');

/* ==========================================================
   ADMIN LOGIN  —  POST /api/auth/admin-login
========================================================== */
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminHash  = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret  = process.env.JWT_SECRET;

    if (!adminEmail || !adminHash || !jwtSecret) {
      console.error('❌ Missing ADMIN_EMAIL, ADMIN_PASSWORD_HASH or JWT_SECRET');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error.'
      });
    }

    if (email.toLowerCase().trim() !== adminEmail.toLowerCase().trim()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, adminHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { email: adminEmail, role: 'admin' },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: { email: adminEmail, role: 'admin' },
    });

  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

/* ==========================================================
   STUDENT LOGIN HANDLER
   Mounted at both /login and /student-login
========================================================== */
const studentLoginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const registration = await Registration.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password');

    if (!registration) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // ── Status gate: only 'approved' may log in ───────────────────────────
    if (registration.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your application is under review. You will be notified by email once approved.'
      });
    }

    if (registration.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your application was not approved. Please contact support.'
      });
    }

    // At this point status must be 'approved' (or 'verified' for legacy records)
    if (registration.status !== 'approved' && registration.status !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Please contact support.'
      });
    }

    // ── Password check ────────────────────────────────────────────────────
    const isMatch = await bcrypt.compare(password, registration.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // ── Issue token ───────────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id:             registration._id,
        registrationId: registration.registrationId,
        email:          registration.email,
        role:           'student',
        category:       registration.category,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      student: {
        id:                   registration._id,
        registrationId:       registration.registrationId,
        fullName:             registration.fullName,
        email:                registration.email,
        phone:                registration.phone,
        category:             registration.category,
        status:               registration.status,
        assessmentScore:      registration.assessmentScore      ?? null,
        assessmentTotal:      registration.assessmentTotal      ?? null,
        assessmentPercentage: registration.assessmentPercentage ?? null,
        assessmentLevel:      registration.assessmentLevel      ?? null,
        submittedAt:          registration.submittedAt,
      },
    });

  } catch (err) {
    console.error('Student login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

router.post('/login',         studentLoginHandler);
router.post('/student-login', studentLoginHandler);

/* ==========================================================
   CHANGE PASSWORD  —  POST /api/auth/change-password
========================================================== */
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.'
      });
    }

    const registration = await Registration.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, registration.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Assign plain text — pre-save hook in Registration.js hashes it
    registration.password = newPassword;
    await registration.save();

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Password change failed.'
    });
  }
});

module.exports = router;