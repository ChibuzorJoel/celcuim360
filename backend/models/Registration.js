// models/Registration.js

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    registrationId:   { type: String, unique: true, index: true },
    fullName:         { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:            { type: String, required: true, trim: true },
    category:         { type: String, enum: ['nysc', 'graduate'], required: true },
    password:         { type: String, required: true, select: false },
    status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason:  { type: String },
    submittedAt:      { type: Date, default: Date.now },

    assessmentScore:      { type: Number },
    assessmentTotal:      { type: Number },
    assessmentPercentage: { type: Number },
    assessmentLevel:      { type: String, enum: ['below-expectation', 'foundational', 'strong'] },
    assessmentAnswers:    { type: Array, default: [] },

    // Original filenames — kept for reference and local-disk fallback
    files: {
      photo:        { type: String, default: null },
      statement:    { type: String, default: null },
      callUpLetter: { type: String, default: null },
      paymentProof: { type: String, default: null },
    },

    // Telegram file_id for each document — populated when Telegram is configured.
    // null means the file was not uploaded to Telegram (old record or upload failed).
    telegramFileIds: {
      photo:        { type: String, default: null },
      statement:    { type: String, default: null },
      callUpLetter: { type: String, default: null },
      paymentProof: { type: String, default: null },
    },

    // True once at least one file has been stored on Telegram for this registration
    storedOnTelegram: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Registration', registrationSchema);