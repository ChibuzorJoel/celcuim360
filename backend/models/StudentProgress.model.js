/**
 * models/StudentProgress.model.js
 */
const mongoose = require('mongoose');

const StudentProgressSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true },
  weekProgress: {
    type: Map,
    of: new mongoose.Schema({
      submitted:   { type: Boolean, default: false },
      score:       { type: Number,  default: null },
      feedback:    { type: String,  default: null },
      graded:      { type: Boolean, default: false },
      submittedAt: { type: Date,    default: null },
    }, { _id: false }),
    default: {},
  },
  finalExam: {
    submitted:   { type: Boolean, default: false },
    score:       { type: Number,  default: null },
    feedback:    { type: String,  default: null },
    graded:      { type: Boolean, default: false },
    submittedAt: { type: Date,    default: null },
  },
});

module.exports = mongoose.models.StudentProgress
  || mongoose.model('StudentProgress', StudentProgressSchema);