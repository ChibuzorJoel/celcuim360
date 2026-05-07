/**
 * middleware/validation.middleware.js - Request validation
 */

const cleanupUploadedFiles = (files) => {
  if (!files) return;

  Object.values(files).forEach(fileArray => {
    fileArray.forEach(file => {
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  });
};

const validateRegistration = (req, res, next) => {
  const {
    fullName,
    email,
    phone,
    category,
    assessmentScore,
    assessmentTotal,
    password
  } = req.body;

  // ─────────────────────────────────────────────
  // 🔹 Validate Full Name
  // ─────────────────────────────────────────────
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Full name is required'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Email
  // ─────────────────────────────────────────────
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Phone
  // ─────────────────────────────────────────────
  const phoneRegex = /^[0-9+]{7,15}$/;

  if (!phone || !phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Valid phone number is required (7–15 digits)'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Category
  // ─────────────────────────────────────────────
  if (!category || !['nysc', 'graduate'].includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Valid category is required'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Password
  // ─────────────────────────────────────────────
  if (!password || password.length < 8) {
    cleanupUploadedFiles(req.files);
    return res.status(422).json({
      success: false,
      message: 'Password must be at least 8 characters.'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Files
  // ─────────────────────────────────────────────
  if (!req.files || !req.files.photo) {
    return res.status(400).json({
      success: false,
      message: 'Photo is required'
    });
  }

  if (category === 'nysc') {
    if (!req.files.statement) {
      return res.status(400).json({
        success: false,
        message: 'Statement of Result is required for NYSC category'
      });
    }

    if (!req.files.callUpLetter) {
      return res.status(400).json({
        success: false,
        message: 'NYSC Call-Up Letter is required'
      });
    }
  }

  if (!req.files.paymentProof) {
    return res.status(400).json({
      success: false,
      message: 'Payment proof is required'
    });
  }

  // ─────────────────────────────────────────────
  // 🔹 Validate Assessment
  // ─────────────────────────────────────────────
  if (
    assessmentScore === undefined ||
    assessmentTotal === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'Assessment data is incomplete'
    });
  }

  // Optional: ensure numbers
  if (isNaN(assessmentScore) || isNaN(assessmentTotal)) {
    return res.status(400).json({
      success: false,
      message: 'Assessment values must be numbers'
    });
  }

  // ─────────────────────────────────────────────
  // ✅ Passed all validations
  // ─────────────────────────────────────────────
  next();
};

module.exports = { validateRegistration };