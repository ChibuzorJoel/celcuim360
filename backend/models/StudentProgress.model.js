/**
 * models/StudentProgress.model.js
 * FIXED: weekProgress now stores answers array so admin can read them
 */

const mongoose = require('mongoose');

// Answer sub-schema
const AnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number },
  questionText:  { type: String },
  sectionTitle:  { type: String, default: null },  // for final exam sections
  answer:        { type: String, default: '' },
}, { _id: false });

// Weekly progress sub-schema — stores submission + answers + grade
const WeekProgressSchema = new mongoose.Schema({
  submitted:   { type: Boolean, default: false },
  score:       { type: Number,  default: null  },
  feedback:    { type: String,  default: null  },
  graded:      { type: Boolean, default: false },
  submittedAt: { type: Date,    default: null  },
  gradedAt:    { type: Date,    default: null  },
  gradedBy:    { type: String,  default: null  },
  answers:     { type: [AnswerSchema], default: [] },  // ← FIXED: answers now stored
}, { _id: false });

// Final exam sub-schema
const FinalExamSchema = new mongoose.Schema({
  submitted:   { type: Boolean, default: false },
  score:       { type: Number,  default: null  },
  feedback:    { type: String,  default: null  },
  graded:      { type: Boolean, default: false },
  submittedAt: { type: Date,    default: null  },
  gradedAt:    { type: Date,    default: null  },
  gradedBy:    { type: String,  default: null  },
  answers:     { type: [AnswerSchema], default: [] },  // ← FIXED: answers now stored
}, { _id: false });

const StudentProgressSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true },
  studentName:    { type: String, default: '' },
  studentEmail:   { type: String, default: '' },

  // Map of weekId (string "1"–"6") → WeekProgressSchema
  weekProgress: {
    type: Map,
    of:   WeekProgressSchema,
    default: {},
  },

  finalExam: {
    type:    FinalExamSchema,
    default: () => ({}),
  },
}, { timestamps: true });

module.exports = mongoose.models.StudentProgress
  || mongoose.model('StudentProgress', StudentProgressSchema);