/**
 * models/CourseworkQuestion.js
 * Stores the 10 scenario questions per week — admin can edit/replace them
 */
const mongoose = require('mongoose');

const CourseworkQuestionSchema = new mongoose.Schema({
  weekNumber:  { type: Number, required: true, min: 1, max: 6, unique: true },
  weekTitle:   { type: String, required: true },
  instruction: { type: String, default: 'Based on what you have learned this week, respond to each real-life workplace scenario clearly and practically. Your responses should reflect how a work-ready professional is expected to think, behave, communicate, and act in a real workplace environment.' },
  questions:   [{ type: String, required: true }], // array of 10 strings
  isPublished: { type: Boolean, default: false },   // admin publishes when ready
  publishedAt: { type: Date,   default: null },
  updatedAt:   { type: Date,   default: Date.now },
  updatedBy:   { type: String, default: 'admin' }
});

// Auto-update updatedAt on save
CourseworkQuestionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CourseworkQuestion', CourseworkQuestionSchema);