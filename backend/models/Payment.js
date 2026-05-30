/**
 * models/Payment.js
 * Tracks payment verification for registrations
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId:      { type: String, unique: true, index: true },
  registrationId: { type: String, required: true, index: true },
  studentName:    { type: String, required: true },
  studentEmail:   { type: String, required: true, lowercase: true },
  amount:         { type: Number, required: true },          // in NGN
  currency:       { type: String, default: 'NGN' },
  reference:      { type: String, default: null },           // bank/Paystack ref
  method:         {
    type: String,
    enum: ['bank_transfer', 'paystack', 'flutterwave', 'cash', 'other'],
    default: 'bank_transfer',
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'refunded'],
    default: 'pending',
    index: true,
  },
  proofFile:      { type: String, default: null },           // uploaded filename
  notes:          { type: String, default: null },           // admin notes
  verifiedBy:     { type: String, default: null },
  verifiedAt:     { type: Date, default: null },
  rejectionReason:{ type: String, default: null },
  submittedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

paymentSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; }
});

module.exports = mongoose.models.Payment
  || mongoose.model('Payment', paymentSchema);