/**
 * models/FinalExamConfig.model.js
 *
 * Singleton document that tracks whether the Final Exam is published
 * (visible/accessible to eligible students). The 40 exam questions
 * themselves stay hardcoded in the student app — this model only stores
 * the publish toggle and its metadata. There should only ever be ONE
 * document in this collection.
 */

const mongoose = require('mongoose');

const FinalExamConfigSchema = new mongoose.Schema({
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date,    default: null },
  updatedAt:   { type: Date,    default: Date.now },
  updatedBy:   { type: String,  default: 'admin' },
});

module.exports = mongoose.models.FinalExamConfig || mongoose.model('FinalExamConfig', FinalExamConfigSchema);