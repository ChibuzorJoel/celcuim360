// controllers/registrationController.js
// Handles all student registration, file serving, profile, and admin operations.
// Stack: Express · Mongoose · Multer · bcryptjs · jsonwebtoken · nodemailer

'use strict';

const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Registration = require('../models/Registration'); // Mongoose model (see bottom of file)

// ─────────────────────────────────────────────────────────────────────────────
//  Multer — disk storage (files stored under uploads/<registrationId>/)
//  The registrationId is not known yet at upload time, so we stage files
//  into uploads/staging/ and move them after the record is saved.
// ─────────────────────────────────────────────────────────────────────────────

const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_ROOT  = path.join(__dirname, '..', 'uploads');
const STAGING_DIR  = path.join(UPLOAD_ROOT, 'staging');
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Ensure staging directory exists at startup
fs.mkdirSync(STAGING_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STAGING_DIR),
  filename:    (_req,  file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([
  { name: 'photo',        maxCount: 1 },
  { name: 'statement',    maxCount: 1 },
  { name: 'callUpLetter', maxCount: 1 },
  { name: 'paymentProof', maxCount: 1 },
]);

// Export the multer middleware so routes can apply it before the controller
module.exports.uploadMiddleware = upload;

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a human-readable registration ID: REG-YYYYMMDD-XXXXX */
function generateRegistrationId() {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `REG-${date}-${rand}`;
}

/** Move a staged file to its permanent home under uploads/<registrationId>/ */
function stageToFinal(stagingPath, registrationId, filename) {
  const dir  = path.join(UPLOAD_ROOT, registrationId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  fs.renameSync(stagingPath, dest); // atomic on same filesystem
  return filename;
}

/** Delete a file silently (no throw) */
function unlinkSilent(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) {}
}

/** Sign a JWT */
function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

/** Verify a JWT — returns payload or null */
function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch (_) { return null; }
}

/** Standard JSON error response */
function sendError(res, status, message, details) {
  return res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

/** Nodemailer transporter (configure via env) */
function getMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendConfirmationEmail(record) {
  if (!process.env.SMTP_USER) return; // skip if not configured
  try {
    const mailer = getMailer();
    await mailer.sendMail({
      from:    `"Celcium360" <${process.env.SMTP_USER}>`,
      to:      record.email,
      subject: `Registration Received — ${record.registrationId}`,
      html: `
        <p>Dear ${record.fullName},</p>
        <p>Your registration has been received and is under review.</p>
        <p><strong>Registration ID:</strong> ${record.registrationId}</p>
        <p>We will notify you once your application is processed.</p>
        <br/><p>Celcium360 Solutions Limited</p>
      `,
    });
  } catch (err) {
    console.warn('[Email] Confirmation email failed:', err.message);
  }
}

async function sendStatusEmail(record) {
  if (!process.env.SMTP_USER) return;
  try {
    const mailer   = getMailer();
    const approved = record.status === 'approved';
    await mailer.sendMail({
      from:    `"Celcium360" <${process.env.SMTP_USER}>`,
      to:      record.email,
      subject: `Application ${approved ? 'Approved' : 'Update'} — ${record.registrationId}`,
      html: approved
        ? `<p>Dear ${record.fullName},</p><p>Congratulations! Your application has been <strong>approved</strong>. You may now log in to the student portal.</p>`
        : `<p>Dear ${record.fullName},</p><p>Your application was not approved at this time.</p>${
            record.rejectionReason
              ? `<p><strong>Reason:</strong> ${record.rejectionReason}</p>`
              : ''
          }<p>Please contact support if you have questions.</p>`,
    });
  } catch (err) {
    console.warn('[Email] Status email failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH MIDDLEWARE (used by protected routes)
// ─────────────────────────────────────────────────────────────────────────────

module.exports.requireAuth = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return sendError(res, 401, 'No token provided.');
  const payload = verifyToken(token);
  if (!payload) return sendError(res, 401, 'Invalid or expired token.');
  req.user = payload;
  next();
};

module.exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return sendError(res, 403, 'Admin access required.');
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/registration/submit
//  Multipart form. Multer runs before this via uploadMiddleware.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.submitRegistration = async (req, res) => {
  const staged = []; // track staged file paths for cleanup on error

  try {
    // ── 1. Validate required text fields ──────────────────────────────────
    const { fullName, email, phone, category, password } = req.body;

    if (!fullName?.trim())   return sendError(res, 400, 'Full name is required.');
    if (!email?.trim())      return sendError(res, 400, 'Email is required.');
    if (!phone?.trim())      return sendError(res, 400, 'Phone number is required.');
    if (!['nysc', 'graduate'].includes(category?.toLowerCase()))
      return sendError(res, 400, "Category must be 'nysc' or 'graduate'.");
    if (!password || password.length < 8)
      return sendError(res, 400, 'Password must be at least 8 characters.');

    // ── 2. Duplicate check ────────────────────────────────────────────────
    const existing = await Registration.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return sendError(res, 409, 'An account with this email already exists.');

    // ── 3. Collect staged files ───────────────────────────────────────────
    const files = req.files || {};
    if (files.photo)        staged.push(files.photo[0].path);
    if (files.statement)    staged.push(files.statement[0].path);
    if (files.callUpLetter) staged.push(files.callUpLetter[0].path);
    if (files.paymentProof) staged.push(files.paymentProof[0].path);

    // ── 4. Build record ───────────────────────────────────────────────────
    const registrationId = generateRegistrationId();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Move staged files to permanent location
    const fileRecord = {
      photo:        null,
      statement:    null,
      callUpLetter: null,
      paymentProof: null,
    };

    if (files.photo) {
      const f = files.photo[0];
      fileRecord.photo = stageToFinal(f.path, registrationId, `photo${path.extname(f.originalname)}`);
    }
    if (files.statement) {
      const f = files.statement[0];
      fileRecord.statement = stageToFinal(f.path, registrationId, `statement${path.extname(f.originalname)}`);
    }
    if (files.callUpLetter) {
      const f = files.callUpLetter[0];
      fileRecord.callUpLetter = stageToFinal(f.path, registrationId, `callUpLetter${path.extname(f.originalname)}`);
    }
    if (files.paymentProof) {
      const f = files.paymentProof[0];
      fileRecord.paymentProof = stageToFinal(f.path, registrationId, `paymentProof${path.extname(f.originalname)}`);
    }

    // ── 5. Parse assessment answers (optional) ────────────────────────────
    let assessmentAnswers = [];
    try {
      const raw = req.body.assessmentAnswers;
      if (raw) assessmentAnswers = JSON.parse(raw);
    } catch (_) { /* ignore parse errors */ }

    // ── 6. Save to MongoDB ────────────────────────────────────────────────
    const record = await Registration.create({
      registrationId,
      fullName:              fullName.trim(),
      email:                 email.trim().toLowerCase(),
      phone:                 phone.trim(),
      category:              category.toLowerCase(),
      password:              hashedPassword,
      status:                'pending',
      submittedAt:           new Date(),
      assessmentScore:       req.body.assessmentScore      ? Number(req.body.assessmentScore)      : undefined,
      assessmentTotal:       req.body.assessmentTotal      ? Number(req.body.assessmentTotal)      : undefined,
      assessmentPercentage:  req.body.assessmentPercentage ? Number(req.body.assessmentPercentage) : undefined,
      assessmentLevel:       req.body.assessmentLevel      || undefined,
      assessmentAnswers,
      files:                 fileRecord,
    });

    // ── 7. Send confirmation email (non-blocking) ─────────────────────────
    sendConfirmationEmail(record);

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully.',
      data: {
        registrationId: record.registrationId,
        email:          record.email,
        status:         record.status,
        submittedAt:    record.submittedAt,
      },
    });

  } catch (err) {
    // Clean up any staged files that weren't moved
    staged.forEach(p => unlinkSilent(p));
    console.error('[submitRegistration]', err);

    if (err.code === 11000)
      return sendError(res, 409, 'An account with this email already exists.');

    return sendError(res, 500, 'Registration failed. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/student-login
// ─────────────────────────────────────────────────────────────────────────────

module.exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return sendError(res, 400, 'Email and password are required.');

    const student = await Registration.findOne({ email: email.trim().toLowerCase() })
      .select('+password'); // password is select:false in schema

    if (!student)
      return sendError(res, 401, 'Invalid email or password.');

    const match = await bcrypt.compare(password, student.password);
    if (!match)
      return sendError(res, 401, 'Invalid email or password.');

    // Only approved students may log in
    // Remove this block if you want pending students to access a limited portal
    if (student.status === 'rejected')
      return sendError(res, 403, 'Your application was not approved. Please contact support.');

    const token = signToken({
      id:             student._id,
      registrationId: student.registrationId,
      email:          student.email,
      role:           'student',
    });

    return res.json({
      success: true,
      token,
      student: {
        registrationId:       student.registrationId,
        fullName:             student.fullName,
        email:                student.email,
        phone:                student.phone,
        category:             student.category,
        status:               student.status,
        assessmentScore:      student.assessmentScore,
        assessmentTotal:      student.assessmentTotal,
        assessmentPercentage: student.assessmentPercentage,
        assessmentLevel:      student.assessmentLevel,
        submittedAt:          student.submittedAt,
      },
    });

  } catch (err) {
    console.error('[studentLogin]', err);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/registration/:id
//  Public — returns safe (no password) student profile
// ─────────────────────────────────────────────────────────────────────────────

module.exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Registration.findOne({
      $or: [{ registrationId: id }, { _id: id.match(/^[a-f\d]{24}$/i) ? id : undefined }],
    });

    if (!student)
      return sendError(res, 404, 'Registration not found.');

    return res.json({ success: true, data: student });

  } catch (err) {
    console.error('[getStudent]', err);
    return sendError(res, 500, 'Could not retrieve registration.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/registration/update/:id
//  Protected — student can update their own profile (non-sensitive fields only)
// ─────────────────────────────────────────────────────────────────────────────

module.exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: students may only update their own record
    if (req.user?.role === 'student' && req.user.registrationId !== id)
      return sendError(res, 403, 'You can only update your own profile.');

    // Whitelist updatable fields (no status, password, or files here)
    const allowed = ['fullName', 'phone'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    if (Object.keys(update).length === 0)
      return sendError(res, 400, 'No updatable fields provided.');

    const student = await Registration.findOneAndUpdate(
      { registrationId: id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!student) return sendError(res, 404, 'Registration not found.');

    return res.json({ success: true, message: 'Profile updated.', data: student });

  } catch (err) {
    console.error('[updateProfile]', err);
    return sendError(res, 500, 'Update failed.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/registration/:id/file/:filename
//  Serves uploaded files — admin or the owning student only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.serveFile = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // Security: prevent path traversal
    const safeName = path.basename(filename);
    if (safeName !== filename)
      return sendError(res, 400, 'Invalid filename.');

    // Verify the registration exists and the file belongs to it
    const student = await Registration.findOne({ registrationId: id });
    if (!student) return sendError(res, 404, 'Registration not found.');

    const registeredFiles = Object.values(student.files || {});
    if (!registeredFiles.includes(safeName))
      return sendError(res, 404, 'File not found.');

    // Guard: admin or owner
    if (req.user?.role !== 'admin' && req.user?.registrationId !== id)
      return sendError(res, 403, 'Access denied.');

    const filePath = path.join(UPLOAD_ROOT, id, safeName);
    if (!fs.existsSync(filePath))
      return sendError(res, 404, 'File not found on disk.');

    return res.sendFile(filePath);

  } catch (err) {
    console.error('[serveFile]', err);
    return sendError(res, 500, 'Could not serve file.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — GET /api/admin/registrations
//  Returns all registrations (password excluded). Admin only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminGetAll = async (req, res) => {
  try {
    const registrations = await Registration.find()
      .sort({ submittedAt: -1 })
      .lean();

    return res.json(registrations);

  } catch (err) {
    console.error('[adminGetAll]', err);
    return sendError(res, 500, 'Could not fetch registrations.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/admin/registrations/:id/status
//  Updates status (pending → approved | rejected). Admin only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminUpdateStatus = async (req, res) => {
  try {
    const { id }  = req.params;
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status))
      return sendError(res, 400, "Status must be 'pending', 'approved', or 'rejected'.");

    if (status === 'rejected' && !rejectionReason?.trim())
      return sendError(res, 400, 'A rejection reason is required when rejecting an application.');

    const update = { status };
    if (status === 'rejected') update.rejectionReason = rejectionReason.trim();
    else update.rejectionReason = undefined; // clear if re-approving

    const student = await Registration.findOneAndUpdate(
      { registrationId: id },
      { $set: update },
      { new: true }
    );

    if (!student) return sendError(res, 404, 'Registration not found.');

    // Non-blocking email
    sendStatusEmail(student);

    return res.json({
      success: true,
      message: `Status updated to '${status}'.`,
      data: {
        registrationId: student.registrationId,
        status:         student.status,
        rejectionReason: student.rejectionReason,
      },
    });

  } catch (err) {
    console.error('[adminUpdateStatus]', err);
    return sendError(res, 500, 'Status update failed.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — DELETE /api/admin/registrations/:id
//  Deletes record + all associated files. Admin only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Registration.findOneAndDelete({ registrationId: id });
    if (!student) return sendError(res, 404, 'Registration not found.');

    // Remove the file directory
    const dir = path.join(UPLOAD_ROOT, id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    return res.json({ success: true, message: 'Registration deleted.' });

  } catch (err) {
    console.error('[adminDelete]', err);
    return sendError(res, 500, 'Delete failed.');
  }
};



// ─────────────────────────────────────────────────────────────────────────────
//  EXPRESS ROUTER wiring — paste into routes/registration.js
// ─────────────────────────────────────────────────────────────────────────────
/*

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/registrationController');

// ── Public ──────────────────────────────────────────────────────────────────
router.post(
  '/submit',
  ctrl.uploadMiddleware,                       // multer processes files first
  ctrl.submitRegistration
);

// ── Auth ─────────────────────────────────────────────────────────────────────
// (mounted under /api/auth in server.js)
// router.post('/student-login', ctrl.studentLogin);

// ── Protected — student ───────────────────────────────────────────────────────
router.get(
  '/:id',
  ctrl.requireAuth,
  ctrl.getStudent
);

router.put(
  '/update/:id',
  ctrl.requireAuth,
  ctrl.updateProfile
);

router.get(
  '/:id/file/:filename',
  ctrl.requireAuth,
  ctrl.serveFile
);

// ── Protected — admin ─────────────────────────────────────────────────────────
router.get(
  '/',
  ctrl.requireAuth,
  ctrl.requireAdmin,
  ctrl.adminGetAll
);

router.patch(
  '/:id/status',
  ctrl.requireAuth,
  ctrl.requireAdmin,
  ctrl.adminUpdateStatus
);

router.delete(
  '/:id',
  ctrl.requireAuth,
  ctrl.requireAdmin,
  ctrl.adminDelete
);

module.exports = router;

*/

// ─────────────────────────────────────────────────────────────────────────────
//  server.js wiring snippet
// ─────────────────────────────────────────────────────────────────────────────
/*

const registrationRoutes = require('./routes/registration');
const ctrl               = require('./controllers/registrationController');

app.use('/api/registration',    registrationRoutes);
app.post('/api/auth/student-login', ctrl.studentLogin);

// Admin routes (separate mount keeps auth concerns clear)
const adminRouter = require('express').Router();
adminRouter.use(ctrl.requireAuth, ctrl.requireAdmin);
adminRouter.get('/',              ctrl.adminGetAll);
adminRouter.patch('/:id/status',  ctrl.adminUpdateStatus);
adminRouter.delete('/:id',        ctrl.adminDelete);
app.use('/api/admin/registrations', adminRouter);

*/

// ─────────────────────────────────────────────────────────────────────────────
//  Required npm packages
//  npm install bcryptjs jsonwebtoken multer nodemailer uuid
// ─────────────────────────────────────────────────────────────────────────────