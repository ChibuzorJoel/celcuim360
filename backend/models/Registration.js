/**
 * models/Registration.js
 * Registration Document Schema (FULL UPDATED VERSION)
 */

const mongoose = require('mongoose');

/**
 * ─────────────────────────────────────────────────────────────
 * Assessment Answer Schema
 * ─────────────────────────────────────────────────────────────
 */

const AssessmentAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: Number
    },

    selectedOption: {
      type: String
    },

    isCorrect: {
      type: Boolean
    }
  },
  {
    _id: false
  }
);

/**
 * ─────────────────────────────────────────────────────────────
 * Registration Schema
 * ─────────────────────────────────────────────────────────────
 */

const RegistrationSchema = new mongoose.Schema(
  {
    //
    // ── Basic Information ────────────────────────────────────
    //

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
        'Invalid email format'
      ]
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 20
    },

    category: {
      type: String,
      enum: ['nysc', 'graduate'],
      required: [true, 'Category is required']
    },

    //
    // ── Uploaded Photo ───────────────────────────────────────
    //

    photo: {
      filename: String,
      path: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String
    },

    //
    // ── NYSC Documents ───────────────────────────────────────
    //

    statement: {
      filename: String,
      path: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String
    },

    callUpLetter: {
      filename: String,
      path: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String
    },

    //
    // ── Payment Section ──────────────────────────────────────
    //

    paymentProof: {
      filename: String,
      path: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String
    },

    paymentAmount: {
      type: String,
      enum: ['₦50,000', '₦200,000'],
      required: [true, 'Payment amount is required']
    },

    paymentVerified: {
      type: Boolean,
      default: false
    },

    //
    // ── Assessment Section ───────────────────────────────────
    //

    assessment: {
      score: {
        type: Number,
        min: 0,
        default: 0
      },

      total: {
        type: Number,
        default: 10
      },

      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },

      level: {
        type: String,
        enum: [
          'below-expectation',
          'foundational',
          'strong'
        ],
        default: 'foundational'
      },

      answers: [AssessmentAnswerSchema],

      completedAt: {
        type: Date,
        default: null
      }
    },

    //
    // ── Status & Verification ────────────────────────────────
    //

    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'rejected',
        'submitted',
        'under-review',
        'verified'
      ],
      default: 'pending'
    },

    rejectionReason: {
      type: String,
      default: null
    },

    verificationNotes: {
      type: String,
      default: null
    },

    //
    // ── Metadata ─────────────────────────────────────────────
    //

    submittedAt: {
      type: Date,
      default: Date.now
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    ipAddress: {
      type: String,
      default: null
    },

    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * ─────────────────────────────────────────────────────────────
 * Indexes
 * ─────────────────────────────────────────────────────────────
 */

RegistrationSchema.index(
  {
    email: 1
  },
  {
    unique: true,
    sparse: true
  }
);

RegistrationSchema.index({
  status: 1,
  submittedAt: -1
});

RegistrationSchema.index({
  category: 1
});

/**
 * ─────────────────────────────────────────────────────────────
 * Pre-save Hook (FIXED)
 * IMPORTANT:
 * Do NOT use async + next together
 * This avoids:
 * TypeError: next is not a function
 * ─────────────────────────────────────────────────────────────
 */

RegistrationSchema.pre('save', function () {
  // Ensure submittedAt always exists
  if (!this.submittedAt) {
    this.submittedAt = new Date();
  }

  // Auto-set verifiedAt if approved/verified
  if (
    (this.status === 'approved' ||
      this.status === 'verified') &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }

  // Clear rejection reason if approved
  if (
    this.status === 'approved' ||
    this.status === 'verified'
  ) {
    this.rejectionReason = null;
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * Export Model
 * ─────────────────────────────────────────────────────────────
 */

module.exports = mongoose.model(
  'Registration',
  RegistrationSchema
);