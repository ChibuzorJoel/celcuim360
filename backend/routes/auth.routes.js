const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const Registration = require('../models/Registration');
 
/**
 * POST /api/auth/login
 * Student portal login using email + password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
 
    // Find registration — explicitly select password (select:false by default)
    const registration = await Registration.findOne({
      email: email.toLowerCase().trim()
    }).select('+password');
 
    if (!registration) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
 
    // Only approved students can log in
    if (registration.status !== 'approved') {
      const msgs = {
        pending:  'Your registration is pending verification. You will receive an email once approved.',
        rejected: 'Your registration was not approved. Please contact support.',
        default:  'Your account is not yet active. Please wait for admin approval.'
      };
      return res.status(403).json({
        success: false,
        message: msgs[registration.status] || msgs.default
      });
    }
 
    // Check password
    const isMatch = await bcrypt.compare(password, registration.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
 
    // Sign JWT
    const token = jwt.sign(
      {
        id:       registration._id,
        email:    registration.email,
        category: registration.category,
        role:     'student'
      },
      process.env.JWT_SECRET || 'celcium360_secret_change_this',
      { expiresIn: '7d' }
    );
 
    // Return student profile (no password)
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      student: {
        registrationId:   registration._id,
        fullName:         registration.fullName,
        email:            registration.email,
        phone:            registration.phone,
        category:         registration.category,
        status:           registration.status,
        assessmentScore:  registration.assessment?.score       ?? null,
        assessmentLevel:  registration.assessment?.level       ?? null,
        assessmentPct:    registration.assessment?.percentage  ?? null,
        photo:            registration.photo?.filename         ?? null,
        enrolledAt:       registration.submittedAt
      }
    });
 
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});
 
/**
 * POST /api/auth/change-password
 * Authenticated student changes their password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
 
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
 
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
 
    const registration = await Registration.findOne({
      email: email.toLowerCase().trim()
    }).select('+password');
 
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
 
    const isMatch = await bcrypt.compare(currentPassword, registration.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
 
    registration.password = newPassword; // pre-save hook re-hashes
    await registration.save();
 
    res.json({ success: true, message: 'Password changed successfully.' });
 
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password change failed.' });
  }
});
 
module.exports = router;