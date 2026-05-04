/**
 * controllers/registration.controller.js - Registration request handler (UPDATED FULL CODE)
 */

const Registration = require('../models/Registration');
const fs = require('fs');
const path = require('path');

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
      category,
      assessmentScore,
      assessmentTotal,
      assessmentPercentage,
      assessmentLevel,
      assessmentAnswers
    } = req.body;

    // Check if email already exists
    const existingRegistration = await Registration.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingRegistration) {
      cleanupUploadedFiles(req.files);

      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please use a different email.'
      });
    }

    // Uploaded files
    const photoFile = req.files?.photo?.[0];
    const statementFile = req.files?.statement?.[0];
    const callUpFile = req.files?.callUpLetter?.[0];
    const paymentProofFile = req.files?.paymentProof?.[0];

    // Create registration
    const registration = new Registration({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      category,

      // Photo
      photo: photoFile
        ? {
            filename: photoFile.filename,
            path: photoFile.path,
            uploadedAt: new Date(),
            size: photoFile.size,
            mimeType: photoFile.mimetype
          }
        : null,

      // NYSC Statement
      statement: statementFile
        ? {
            filename: statementFile.filename,
            path: statementFile.path,
            uploadedAt: new Date(),
            size: statementFile.size,
            mimeType: statementFile.mimetype
          }
        : null,

      // Call-up Letter
      callUpLetter: callUpFile
        ? {
            filename: callUpFile.filename,
            path: callUpFile.path,
            uploadedAt: new Date(),
            size: callUpFile.size,
            mimeType: callUpFile.mimetype
          }
        : null,

      // Payment Proof
      paymentProof: paymentProofFile
        ? {
            filename: paymentProofFile.filename,
            path: paymentProofFile.path,
            uploadedAt: new Date(),
            size: paymentProofFile.size,
            mimeType: paymentProofFile.mimetype
          }
        : null,

      paymentAmount: category === 'nysc' ? '₦50,000' : '₦200,000',

      // Assessment
      assessment: {
        score: parseInt(assessmentScore) || 0,
        total: parseInt(assessmentTotal) || 0,
        percentage: parseInt(assessmentPercentage) || 0,
        level: assessmentLevel || '',
        answers: assessmentAnswers ? JSON.parse(assessmentAnswers) : [],
        completedAt: new Date()
      },

      // Metadata
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),

      // IMPORTANT: changed from submitted → pending
      status: 'pending'
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message:
        'Registration submitted successfully. Verification will be completed within 24 hours.',
      data: {
        registrationId: registration._id,
        email: registration.email,
        status: registration.status,
        submittedAt: registration.submittedAt
      }
    });
  } catch (error) {
    console.error('❌ Registration submission error:', error);

    if (req.files) {
      cleanupUploadedFiles(req.files);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit registration'
    });
  }
};

/**
 * Get a registration by ID
 * GET /api/registration/:id
 */
exports.getRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id).select(
      '-paymentProof.path'
    );

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
 * GET /api/registration/email/:email
 */
exports.getRegistrationByEmail = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      email: req.params.email.toLowerCase()
    }).select('-paymentProof.path');

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
 * Get all registrations (admin only)
 * GET /api/registration
 *
 * FIXED:
 * - returns registrationId instead of _id
 * - supports search
 * - supports status/category filters
 * - returns flat structure admin UI expects
 */
exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      const q = new RegExp(search, 'i');

      filter.$or = [
        { fullName: q },
        { email: q },
        { phone: q }
      ];
    }

    const registrations = await Registration.find(filter)
      .sort({ submittedAt: -1 })
      .lean();

    const mapped = registrations.map((r) => ({
      registrationId: r._id.toString(),
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      category: r.category,
      status: r.status,
      submittedAt: r.submittedAt,
      rejectionReason: r.rejectionReason || null,

      // Assessment (flat for admin TS interface)
      assessmentScore: r.assessment?.score,
      assessmentTotal: r.assessment?.total,
      assessmentPercentage: r.assessment?.percentage,
      assessmentLevel: r.assessment?.level,

      // Files (filenames only)
      files: {
        photo: r.photo?.filename || null,
        statement: r.statement?.filename || null,
        callUpLetter: r.callUpLetter?.filename || null,
        paymentProof: r.paymentProof?.filename || null
      }
    }));

    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update verification status
 * PATCH /api/registration/:id/verify
 * PATCH /api/registration/:id/status
 *
 * FIXED:
 * - supports pending / approved / rejected
 * - also supports old values
 * - requires rejection reason for rejected
 */
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const validStatuses = [
      'pending',
      'approved',
      'rejected',
      'submitted',
      'under-review',
      'verified'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(422).json({
        success: false,
        message: 'Rejection reason is required.'
      });
    }

    const updates = {
      status,
      rejectionReason:
        status === 'rejected'
          ? rejectionReason.trim()
          : null
    };

    if (status === 'approved' || status === 'verified') {
      updates.verifiedAt = new Date();
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to '${status}'.`,
      record: {
        ...registration,
        registrationId: registration._id.toString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a registration
 * DELETE /api/registration/:id
 *
 * FIXED:
 * unlinkSync() does NOT use .catch()
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

    const deleteFile = (filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          // ignore file deletion errors
        }
      }
    };

    deleteFile(registration.photo?.path);
    deleteFile(registration.statement?.path);
    deleteFile(registration.callUpLetter?.path);
    deleteFile(registration.paymentProof?.path);

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Serve uploaded files for admin document viewer
 * GET /api/registration/:id/file/:filename
 */
exports.serveFile = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    const filename = req.params.filename;

    const allFiles = [
      registration.photo,
      registration.statement,
      registration.callUpLetter,
      registration.paymentProof
    ].filter(Boolean);

    const fileRecord = allFiles.find(
      (file) => file.filename === filename
    );

    if (!fileRecord || !fs.existsSync(fileRecord.path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found.'
      });
    }

    res.sendFile(path.resolve(fileRecord.path));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Helper: Clean uploaded files on failure
 */
function cleanupUploadedFiles(files) {
  if (!files) return;

  Object.values(files).forEach((fileArray) => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach((file) => {
        if (file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            // ignore cleanup errors
          }
        }
      });
    }
  });
}