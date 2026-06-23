/**
 * models/FinalExamConfig.model.js
 * Singleton — one document stores the Final Exam publish toggle.
 */
const mongoose = require('mongoose');

const FinalExamConfigSchema = new mongoose.Schema({
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date,    default: null  },
  updatedAt:   { type: Date,    default: Date.now },
  updatedBy:   { type: String,  default: 'admin' },
});

module.exports = mongoose.models.FinalExamConfig
  || mongoose.model('FinalExamConfig', FinalExamConfigSchema);