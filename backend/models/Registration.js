/**
 * models/Registration.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Assessment Answer Schema
 */
const AssessmentAnswerSchema = new mongoose.Schema(
  {
    questionId: Number,
    selectedOption: String,
    isCorrect: Boolean
  },
  { _id: false }
);

/**
 * Registration Schema
 */
const RegistrationSchema = new mongoose.Schema(
  {
    /**
     * Added from new schema
     */
    registrationId: {
      type: String,
      unique: true,
      index: true,
      sparse: true
    },

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

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    /**
     * Files
     */
    files: {
      photo: {
        type: String,
        default: null
      },

      statement: {
        type: String,
        default: null
      },

      callUpLetter: {
        type: String,
        default: null
      },

      paymentProof: {
        type: String,
        default: null
      }
    },

    /**
     * Optional detailed file objects
     */
    photo: {
      filename: String,
      path: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String
    },

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

    /**
     * Assessment
     */
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
        enum: ['below-expectation', 'foundational', 'strong'],
        default: 'foundational'
      },

      answers: [AssessmentAnswerSchema],

      completedAt: {
        type: Date,
        default: null
      }
    },

    /**
     * Added flat assessment fields
     */
    assessmentScore: {
      type: Number,
      default: null
    },

    assessmentTotal: {
      type: Number,
      default: null
    },

    assessmentPercentage: {
      type: Number,
      default: null
    },

    assessmentLevel: {
      type: String,
      default: null
    },

    assessmentAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

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
      default: 'pending',
      index: true
    },

    rejectionReason: {
      type: String,
      default: null
    },

    verificationNotes: {
      type: String,
      default: null
    },

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
  { timestamps: true }
);

/**
 * Indexes
 */
RegistrationSchema.index({ email: 1 }, { unique: true, sparse: true });
RegistrationSchema.index({ status: 1, submittedAt: -1 });
RegistrationSchema.index({ category: 1 });

/**
 * Hash Password
 */
RegistrationSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

/**
 * Additional Logic
 */
RegistrationSchema.pre('save', function () {
  if (!this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (
    (this.status === 'approved' || this.status === 'verified') &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }

  if (
    this.status === 'approved' ||
    this.status === 'verified'
  ) {
    this.rejectionReason = null;
  }
});

/**
 * Remove sensitive fields from JSON
 */
RegistrationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

/**
 * Methods
 */
RegistrationSchema.methods.checkPassword = async function (
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports =
  mongoose.models.Registration ||
  mongoose.model('Registration', RegistrationSchema);