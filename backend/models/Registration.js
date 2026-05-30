/**
 * controllers/registration.controller.js - Compatible with your Registration Model
 */

const Registration = require('../models/Registration');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

/**
 * Helper: Clean uploaded files on failure
 */
const cleanupUploadedFiles = (files) => {
  if (!files) return;

  Object.values(files).forEach((fileArray) => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach((file) => {
        if (file?.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error(`Failed to delete file: ${file.path}`);
          }
        }
      });
    }
  });
};

/**
 * Submit Registration
 * POST /api/registration/submit
 */
exports.submitRegistration = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      category,
      assessmentScore,
      assessmentTotal,
      assessmentPercentage,
      assessmentLevel,
      assessmentAnswers
    } = req.body;

    // Validation
    if (!fullName || !email || !phone || !password || !category) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'All fields (fullName, email, phone, password, category) are required.'
      });
    }

    if (password.length < 6) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate email
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Registration.findOne({ email: normalizedEmail });

    if (existing) {
      cleanupUploadedFiles(req.files);
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.'
      });
    }

    // Handle files
    const photoFile = req.files?.photo?.[0];
    const statementFile = req.files?.statement?.[0];
    const callUpFile = req.files?.callUpLetter?.[0];
    const paymentProofFile = req.files?.paymentProof?.[0];

    const registration = new Registration({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: password,                    // ← Let model middleware hash it
      category,

      // File objects (matches your model)
      photo: photoFile ? {
        filename: photoFile.filename,
        path: photoFile.path,
        uploadedAt: new Date(),
        size: photoFile.size,
        mimeType: photoFile.mimetype
      } : null,

      statement: statementFile ? {
        filename: statementFile.filename,
        path: statementFile.path,
        uploadedAt: new Date(),
        size: statementFile.size,
        mimeType: statementFile.mimetype
      } : null,

      callUpLetter: callUpFile ? {
        filename: callUpFile.filename,
        path: callUpFile.path,
        uploadedAt: new Date(),
        size: callUpFile.size,
        mimeType: callUpFile.mimetype
      } : null,

      paymentProof: paymentProofFile ? {
        filename: paymentProofFile.filename,
        path: paymentProofFile.path,
        uploadedAt: new Date(),
        size: paymentProofFile.size,
        mimeType: paymentProofFile.mimetype
      } : null,

      paymentAmount: category === 'nysc' ? '₦50,000' : '₦200,000',

      // Assessment
      assessment: {
        score: parseInt(assessmentScore) || 0,
        total: parseInt(assessmentTotal) || 10,
        percentage: parseInt(assessmentPercentage) || 0,
        level: assessmentLevel || 'foundational',
        answers: assessmentAnswers ? JSON.parse(assessmentAnswers) : [],
        completedAt: new Date()
      },

      // Flat fields (for backward compatibility)
      assessmentScore: parseInt(assessmentScore) || 0,
      assessmentTotal: parseInt(assessmentTotal) || 10,
      assessmentPercentage: parseInt(assessmentPercentage) || 0,
      assessmentLevel: assessmentLevel || 'foundational',

      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'pending'
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      data: {
        registrationId: registration._id,
        email: registration.email,
        status: registration.status
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    cleanupUploadedFiles(req.files);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit registration'
    });
  }
};

/**
 * Student Login
 */
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    email = email.toLowerCase().trim();

    const user = await Registration.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.checkPassword(password);   // Using model's method

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'student' },
      process.env.JWT_SECRET || 'your_secret_key_here_123456',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// ==================== Other Admin Functions ====================

exports.getRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .select('-password');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRegistrationByEmail = async (req, res) => {
  try {
    const registration = await Registration.findOne({ 
      email: req.params.email.toLowerCase() 
    }).select('-password');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(registrations);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateVerificationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const updates = { status };
    if (status === 'rejected' && rejectionReason) updates.rejectionReason = rejectionReason;
    if (['approved', 'verified'].includes(status)) updates.verifiedAt = new Date();

    const registration = await Registration.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, record: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRegistration = async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // Delete files
    const fileFields = ['photo', 'statement', 'callUpLetter', 'paymentProof'];
    fileFields.forEach(field => {
      const file = registration[field];
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    });

    res.status(200).json({ success: true, message: 'Registration deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.serveFile = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Not found' });

    const filename = req.params.filename;
    const fields = ['photo', 'statement', 'callUpLetter', 'paymentProof'];

    for (let field of fields) {
      const file = registration[field];
      if (file && file.filename === filename && fs.existsSync(file.path)) {
        return res.sendFile(path.resolve(file.path));
      }
    }

    res.status(404).json({ success: false, message: 'File not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};