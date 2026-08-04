/**
 * models/Cohort.js
 * Schema matches the fields read/written by controllers/cohort.controller.js
 */

const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema(
  {
    num:     { type: Number, required: true },
    date:    { type: String, required: true }, // e.g. "Jun 2" — display string, recomputed on read
    done:    { type: Boolean, default: false },
    current: { type: Boolean, default: false },
  },
  { _id: false }
);

const cohortSchema = new mongoose.Schema(
  {
    cohortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['forming', 'active', 'closed'],
      default: 'forming',
    },
    maxStudents: {
      type: Number,
      default: 30,
    },
    enrolled: {
      type: Number,
      default: 0,
    },
    approved: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    avgScore: {
      type: Number,
      default: 0,
    },
    weeks: {
      type: [weekSchema],
      default: [],
    },
    createdBy: {
      type: String,
      default: 'admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cohort', cohortSchema);