/**
 * controllers/payment.controller.js
 * Handles payment verification, rejection, receipt upload, and reporting
 *
 * Wire in server.js:
 *   app.use('/api/payments', require('./routes/payment.routes'));
 */

const path         = require('path');
const fs           = require('fs');
const Payment      = require('../models/Payment');
const Registration = require('../models/Registration');
const nodemailer   = require('nodemailer');

// ── Email helper ──────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email skipped — no SMTP] ${subject} → ${to}`);
    return;
  }
  try {
    await mailer.sendMail({
      from: `"Celcium360" <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
    console.log(`[Email] ${subject} → ${to}`);
  } catch (e) {
    console.error(`[Email failed] ${e.message}`);
  }
}

function emailTemplate(title, color, content) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:28px;
                background:#111;color:#e0e0e0;border-radius:12px;border:1px solid ${color};">
      <h2 style="color:${color};margin-top:0;">${title}</h2>
      ${content}
      <hr style="border-color:#2e2e2e;margin:24px 0;">
      <p style="color:#555;font-size:11px;margin:0;">
        Celcium360 Solutions Limited ·
        <a href="mailto:training@celcium360solutions.com" style="color:#B88D2A;">
          training@celcium360solutions.com
        </a>
      </p>
    </div>
  `;
}

function generatePaymentId() {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
}

// ══════════════════════════════════════════════════════════════════════════
//  GET ALL PAYMENTS — admin list with filters
// ══════════════════════════════════════════════════════════════════════════

exports.getAllPayments = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const q = new RegExp(search.trim(), 'i');
      filter.$or = [
        { studentName:  q },
        { studentEmail: q },
        { reference:    q },
        { paymentId:    q },
        { registrationId: q },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Payment.countDocuments(filter);
    const payments = await Payment
      .find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Compute summary stats
    const [totalRevenue, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then(r => r[0]?.total || 0),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'verified' }),
      Payment.countDocuments({ status: 'rejected' }),
    ]);

    res.json({
      success: true,
      payments,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      stats: {
        totalRevenue,
        pending:  pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
      },
    });
  } catch (err) {
    console.error('[getAllPayments]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET SINGLE PAYMENT
// ══════════════════════════════════════════════════════════════════════════

exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ paymentId: req.params.id }).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (err) {
    console.error('[getPayment]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET PAYMENTS BY REGISTRATION
// ══════════════════════════════════════════════════════════════════════════

exports.getPaymentsByRegistration = async (req, res) => {
  try {
    const payments = await Payment
      .find({ registrationId: req.params.registrationId })
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ success: true, payments });
  } catch (err) {
    console.error('[getPaymentsByRegistration]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  CREATE PAYMENT — student submits payment record (proof already uploaded
//  as part of registration; this logs the payment separately if needed)
// ══════════════════════════════════════════════════════════════════════════

exports.createPayment = async (req, res) => {
  try {
    const {
      registrationId, studentName, studentEmail,
      amount, reference, method, proofFile,
    } = req.body;

    if (!registrationId || !studentName || !studentEmail || !amount) {
      return res.status(400).json({
        success: false,
        message: 'registrationId, studentName, studentEmail and amount are required',
      });
    }

    // Verify the registration exists
    const reg = await Registration.findOne({ registrationId }).lean();
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const payment = new Payment({
      paymentId:      generatePaymentId(),
      registrationId,
      studentName:    studentName.trim(),
      studentEmail:   studentEmail.trim().toLowerCase(),
      amount:         Number(amount),
      reference:      reference?.trim() || null,
      method:         method || 'bank_transfer',
      proofFile:      proofFile || reg.files?.paymentProof || null,
      status:         'pending',
      submittedAt:    new Date(),
    });

    await payment.save();
    console.log(`[Payment] Created: ${payment.paymentId} — ${studentName}`);

    // Notify admin
    await sendEmail(
      process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      `💰 New Payment Submitted — ${studentName}`,
      emailTemplate('New Payment Received 💰', '#B88D2A', `
        <p><strong>Name:</strong> ${studentName}</p>
        <p><strong>Email:</strong> ${studentEmail}</p>
        <p><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
        <p><strong>Reference:</strong> ${reference || 'N/A'}</p>
        <p><strong>Method:</strong> ${method || 'Bank Transfer'}</p>
        <p><strong>Receipt:</strong> ${proofFile ? 'Uploaded ✓' : 'Not uploaded'}</p>
        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/admin/payments"
             style="display:inline-block;padding:12px 24px;background:#B88D2A;color:#000;
                    text-decoration:none;border-radius:8px;font-weight:700;">
            Review in Admin Panel →
          </a>
        </p>
      `)
    );

    res.status(201).json({
      success: true,
      message: 'Payment record submitted successfully',
      paymentId: payment.paymentId,
    });
  } catch (err) {
    console.error('[createPayment]', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Payment record already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to submit payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  VERIFY PAYMENT — admin marks payment as verified
// ══════════════════════════════════════════════════════════════════════════

exports.verifyPayment = async (req, res) => {
  try {
    const { verifiedBy, notes } = req.body;

    const payment = await Payment.findOneAndUpdate(
      { paymentId: req.params.id },
      {
        $set: {
          status:     'verified',
          verifiedBy: verifiedBy || 'Admin',
          verifiedAt: new Date(),
          notes:      notes || null,
        },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    console.log(`[Payment] Verified: ${payment.paymentId} — ${payment.studentName}`);

    // Email student confirmation
    await sendEmail(
      payment.studentEmail,
      '✅ Payment Verified — Celcium360',
      emailTemplate('Payment Verified ✅', '#10b981', `
        <p>Hi <strong>${payment.studentName}</strong>,</p>
        <p>Your payment of <strong>₦${payment.amount.toLocaleString()}</strong>
           has been <strong style="color:#10b981;">verified</strong>.</p>
        <div style="background:#1a1a1a;border:1px solid #2e2e2e;border-radius:8px;
                    padding:14px;margin:18px 0;">
          <p style="margin:0;font-size:11px;color:#888;">Payment Reference</p>
          <p style="margin:5px 0 0;font-size:15px;font-weight:700;color:#B88D2A;
                    font-family:monospace;">${payment.reference || payment.paymentId}</p>
        </div>
        <p>Your registration approval is being processed. You will receive
           a separate email once your registration is approved.</p>
        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/student-login"
             style="display:inline-block;padding:12px 24px;background:#B88D2A;color:#000;
                    text-decoration:none;border-radius:8px;font-weight:700;">
            Access Student Portal →
          </a>
        </p>
      `)
    );

    res.json({
      success: true,
      message: `Payment verified. Email sent to ${payment.studentEmail}.`,
      payment,
    });
  } catch (err) {
    console.error('[verifyPayment]', err.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  REJECT PAYMENT — admin rejects with a reason
// ══════════════════════════════════════════════════════════════════════════

exports.rejectPayment = async (req, res) => {
  try {
    const { rejectionReason, rejectedBy } = req.body;

    if (!rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required',
      });
    }

    const payment = await Payment.findOneAndUpdate(
      { paymentId: req.params.id },
      {
        $set: {
          status:          'rejected',
          rejectionReason: rejectionReason.trim(),
          verifiedBy:      rejectedBy || 'Admin',
          verifiedAt:      new Date(),
        },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    console.log(`[Payment] Rejected: ${payment.paymentId} — ${payment.studentName}`);

    // Email student rejection
    await sendEmail(
      payment.studentEmail,
      '❌ Payment Could Not Be Verified — Celcium360',
      emailTemplate('Payment Update', '#ef4444', `
        <p>Hi <strong>${payment.studentName}</strong>,</p>
        <p>Unfortunately, we could not verify your payment of
           <strong>₦${payment.amount.toLocaleString()}</strong> at this time.</p>
        <div style="background:#1a1a1a;border-left:3px solid #ef4444;
                    padding:12px 14px;border-radius:0 8px 8px 0;margin:16px 0;">
          <strong>Reason:</strong>
          <p style="margin:5px 0 0;color:#888;">${rejectionReason}</p>
        </div>
        <p>Please contact us to resolve this issue.</p>
        <p>
          <a href="mailto:training@celcium360solutions.com"
             style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;
                    text-decoration:none;border-radius:8px;font-weight:700;">
            Contact Support
          </a>
        </p>
      `)
    );

    res.json({
      success: true,
      message: `Payment rejected. Email sent to ${payment.studentEmail}.`,
      payment,
    });
  } catch (err) {
    console.error('[rejectPayment]', err.message);
    res.status(500).json({ success: false, message: 'Failed to reject payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  REQUEST RECEIPT — email student asking for proof
// ══════════════════════════════════════════════════════════════════════════

exports.requestReceipt = async (req, res) => {
  try {
    const payment = await Payment.findOne({ paymentId: req.params.id }).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    await sendEmail(
      payment.studentEmail,
      '📎 Payment Receipt Required — Celcium360',
      emailTemplate('Receipt Required 📎', '#f59e0b', `
        <p>Hi <strong>${payment.studentName}</strong>,</p>
        <p>We received your payment record of
           <strong>₦${payment.amount.toLocaleString()}</strong>,
           but we need a copy of your payment receipt to complete verification.</p>
        <p>Please reply to this email with:</p>
        <ul style="color:#888;font-size:12px;line-height:2;">
          <li>A screenshot or PDF of your bank transfer / payment receipt</li>
          <li>Your payment reference number: <strong style="color:#B88D2A;">
              ${payment.reference || 'N/A'}
          </strong></li>
        </ul>
        <p>Alternatively, contact us directly:</p>
        <p>
          <a href="mailto:training@celcium360solutions.com"
             style="display:inline-block;padding:12px 24px;background:#B88D2A;color:#000;
                    text-decoration:none;border-radius:8px;font-weight:700;">
            Email Support
          </a>
        </p>
      `)
    );

    console.log(`[Payment] Receipt requested from ${payment.studentEmail}`);
    res.json({
      success: true,
      message: `Receipt request sent to ${payment.studentEmail}`,
    });
  } catch (err) {
    console.error('[requestReceipt]', err.message);
    res.status(500).json({ success: false, message: 'Failed to send receipt request' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  UPDATE PAYMENT — admin edits amount, reference, method, notes
// ══════════════════════════════════════════════════════════════════════════

exports.updatePayment = async (req, res) => {
  try {
    const { amount, reference, method, notes } = req.body;
    const upd = {};
    if (amount)    upd.amount    = Number(amount);
    if (reference) upd.reference = reference.trim();
    if (method)    upd.method    = method;
    if (notes !== undefined) upd.notes = notes;

    const payment = await Payment.findOneAndUpdate(
      { paymentId: req.params.id },
      { $set: upd },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, message: 'Payment updated', payment });
  } catch (err) {
    console.error('[updatePayment]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE PAYMENT — hard delete (use only for duplicates/errors)
// ══════════════════════════════════════════════════════════════════════════

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ paymentId: req.params.id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    console.log(`[Payment] Deleted: ${payment.paymentId}`);
    res.json({ success: true, message: 'Payment record deleted' });
  } catch (err) {
    console.error('[deletePayment]', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  STATS — summary for admin dashboard
// ══════════════════════════════════════════════════════════════════════════

exports.getStats = async (req, res) => {
  try {
    const [revenue, byStatus, recentPayments] = await Promise.all([
      // Total verified revenue
      Payment.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Count by status
      Payment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Most recent 5 payments
      Payment.find({}).sort({ submittedAt: -1 }).limit(5).lean(),
    ]);

    const stats = {
      totalRevenue:  revenue[0]?.total || 0,
      verifiedCount: revenue[0]?.count || 0,
      pending:       0, verified: 0, rejected: 0, refunded: 0,
    };
    byStatus.forEach(s => { stats[s._id] = s.count; });

    res.json({ success: true, stats, recentPayments });
  } catch (err) {
    console.error('[getStats]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  SYNC FROM REGISTRATION — create payment records from existing
//  registrations that have paymentProof uploaded but no Payment doc yet
// ══════════════════════════════════════════════════════════════════════════

exports.syncFromRegistrations = async (req, res) => {
  try {
    const registrations = await Registration
      .find({ 'files.paymentProof': { $ne: null } })
      .lean();

    let created = 0;
    let skipped = 0;

    for (const reg of registrations) {
      const exists = await Payment.findOne({ registrationId: reg.registrationId });
      if (exists) { skipped++; continue; }

      await Payment.create({
        paymentId:      generatePaymentId(),
        registrationId: reg.registrationId,
        studentName:    reg.fullName,
        studentEmail:   reg.email,
        amount:         45000,                   // default program fee — adjust as needed
        reference:      null,
        method:         'bank_transfer',
        proofFile:      reg.files.paymentProof,
        status:         'pending',
        submittedAt:    reg.submittedAt || new Date(),
      });
      created++;
    }

    console.log(`[Payment Sync] Created: ${created}, Skipped: ${skipped}`);
    res.json({
      success: true,
      message: `Sync complete. Created: ${created}, Already existed: ${skipped}`,
      created, skipped,
    });
  } catch (err) {
    console.error('[syncFromRegistrations]', err.message);
    res.status(500).json({ success: false, message: 'Sync failed' });
  }
};