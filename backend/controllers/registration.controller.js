/**
 * controllers/registration.controller.js - Final Clean Version
 */

const Registration = require('../models/Registration');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
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
 * Submit a new registration
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

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle files
    const photoFile = req.files?.photo?.[0];
    const statementFile = req.files?.statement?.[0];
    const callUpFile = req.files?.callUpLetter?.[0];
    const paymentProofFile = req.files?.paymentProof?.[0];

    const registration = new Registration({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      category,

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

      assessment: {
        score: parseInt(assessmentScore) || 0,
        total: parseInt(assessmentTotal) || 0,
        percentage: parseInt(assessmentPercentage) || 0,
        level: assessmentLevel || '',
        answers: assessmentAnswers ? JSON.parse(assessmentAnswers) : [],
        completedAt: new Date()
      },

      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'pending'
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Verification will be completed within 24 hours.',
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
 * POST /api/registration/login
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

    const isMatch = await bcrypt.compare(password, user.password);

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

/**
 * Get registration by ID
 */
exports.getRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .select('-password -paymentProof.path');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get registration by email
 */
exports.getRegistrationByEmail = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      email: req.params.email.toLowerCase()
    }).select('-password -paymentProof.path');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all registrations (for Admin)
 */
exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ fullName: q }, { email: q }, { phone: q }];
    }

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const mapped = registrations.map((r) => ({
      registrationId: r._id.toString(),
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      category: r.category,
      status: r.status,
      submittedAt: r.createdAt,
      assessmentScore: r.assessment?.score,
      assessmentPercentage: r.assessment?.percentage,
      files: {
        photo: r.photo?.filename || null,
        statement: r.statement?.filename || null,
        callUpLetter: r.callUpLetter?.filename || null,
        paymentProof: r.paymentProof?.filename || null
      }
    }));

    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update registration status
 */
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const updates = { status };
    if (status === 'rejected' && rejectionReason) {
      updates.rejectionReason = rejectionReason.trim();
    }
    if (status === 'approved') {
      updates.verifiedAt = new Date();
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      record: registration
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete registration
 */
exports.deleteRegistration = async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Delete associated files
    const files = [registration.photo, registration.statement, registration.callUpLetter, registration.paymentProof];
    files.forEach(file => {
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    });

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Serve uploaded file
 */
exports.serveFile = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Not found' });

    const filename = req.params.filename;
    const allFiles = [registration.photo, registration.statement, registration.callUpLetter, registration.paymentProof]
      .filter(Boolean);

    const fileRecord = allFiles.find(f => f.filename === filename);

    if (!fileRecord || !fs.existsSync(fileRecord.path)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.sendFile(path.resolve(fileRecord.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};