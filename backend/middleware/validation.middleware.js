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

  // 🔹 Full Name
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ success: false, message: 'Full name is required' });
  }

  // 🔹 Email
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  // 🔹 Phone
  const phoneRegex = /^[0-9+]{7,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'Valid phone number is required (7–15 digits)' });
  }

  // 🔹 Category
  if (!category || !['nysc', 'graduate'].includes(category)) {
    return res.status(400).json({ success: false, message: 'Valid category is required' });
  }

  // 🔹 Password
  if (!password || password.length < 8) {
    cleanupUploadedFiles(req.files);
    return res.status(422).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  // 🔹 Photo (required for all)
  if (!req.files || !req.files.photo) {
    return res.status(400).json({ success: false, message: 'Photo is required' });
  }

  // 🔹 NYSC documents — accept EITHER statement OR callUpLetter (user uploads one)
  if (category === 'nysc') {
    const hasStatement   = !!req.files.statement;
    const hasCallUp      = !!req.files.callUpLetter;

    if (!hasStatement && !hasCallUp) {
      return res.status(400).json({
        success: false,
        message: 'Please upload either your Statement of Result or NYSC Call-Up Letter'
      });
    }
  }

  // 🔹 Payment proof (required for all)
  if (!req.files.paymentProof) {
    return res.status(400).json({ success: false, message: 'Payment proof is required' });
  }

  // 🔹 Assessment
  if (assessmentScore === undefined || assessmentTotal === undefined) {
    return res.status(400).json({ success: false, message: 'Assessment data is incomplete' });
  }

  if (isNaN(assessmentScore) || isNaN(assessmentTotal)) {
    return res.status(400).json({ success: false, message: 'Assessment values must be numbers' });
  }

  // ✅ All good
  next();
};

module.exports = { validateRegistration };