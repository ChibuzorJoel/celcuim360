// controllers/registration.controller.js
// Handles all student registration, file serving, profile, and admin operations.
// Stack: Express · Mongoose · Multer · bcryptjs · jsonwebtoken

'use strict';

const path       = require('path');
const fs         = require('fs');
const https      = require('https');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const Registration  = require('../models/Registration');
const telegram      = require('../services/telegram.service');
const emailService  = require('../services/email.service');

// ─────────────────────────────────────────────────────────────────────────────
//  JWT SECRET
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'celcium360_strong_secret_2026';

// ─────────────────────────────────────────────────────────────────────────────
//  Multer — disk storage
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_ROOT  = path.join(__dirname, '..', 'uploads');
const STAGING_DIR  = path.join(UPLOAD_ROOT, 'staging');
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

module.exports.uploadMiddleware = upload;

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateRegistrationId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `REG-${date}-${rand}`;
}

function stageToFinal(stagingPath, registrationId, filename) {
  const dir  = path.join(UPLOAD_ROOT, registrationId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  fs.renameSync(stagingPath, dest);
  return filename;
}

function unlinkSilent(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) {}
}

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch (_) { return null; }
}

function generateFileToken(registrationId, filename) {
  return jwt.sign(
    { registrationId, filename, purpose: 'file-access' },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
}

function sendError(res, status, message, details) {
  return res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

// NOTE: the old getMailer()/sendConfirmationEmail()/sendStatusEmail() using
// raw nodemailer + SMTP_* env vars have been removed. All outbound mail now
// goes through services/email.service.js (Gmail or Mailtrap, controlled by
// EMAIL_PROVIDER), so templates and the "from" identity stay consistent with
// the auth controller's password-reset emails. See the two call sites below:
// submitRegistration() and adminUpdateStatus().

// ─────────────────────────────────────────────────────────────────────────────
//  uploadFilesToTelegram
//  Called after files have been moved to their final local paths.
//  Uploads each file to Telegram and returns { fieldName: fileId } map.
//  Never throws — failures are logged and the field is left null.
// ─────────────────────────────────────────────────────────────────────────────

async function uploadFilesToTelegram(registrationId, fileRecord, fullName) {
  if (!telegram.isConfigured()) return {};

  const fieldLabels = {
    photo:        '🖼 Photo',
    statement:    '📄 Personal Statement',
    callUpLetter: '📋 Call-Up Letter',
    paymentProof: '💳 Payment Proof',
  };

  const telegramFileIds = {};

  for (const [field, filename] of Object.entries(fileRecord)) {
    if (!filename) continue;

    const localPath = path.join(UPLOAD_ROOT, registrationId, filename);
    if (!fs.existsSync(localPath)) continue;

    try {
      const caption = `${fieldLabels[field] || field}\n👤 ${fullName}\n🆔 ${registrationId}`;
      const { fileId } = await telegram.sendDocument(localPath, caption);
      telegramFileIds[field] = fileId;
      console.log(`[Telegram] ${registrationId}/${field} → file_id=${fileId}`);
    } catch (err) {
      console.error(`[Telegram] Failed to upload ${field} for ${registrationId}:`, err.message);
      // Leave null — local disk copy is the fallback
    }
  }

  return telegramFileIds;
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH MIDDLEWARE
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
// ─────────────────────────────────────────────────────────────────────────────

module.exports.submitRegistration = async (req, res) => {
  const staged = [];

  try {
    const { fullName, email, phone, category, password } = req.body;

    if (!fullName?.trim())   return sendError(res, 400, 'Full name is required.');
    if (!email?.trim())      return sendError(res, 400, 'Email is required.');
    if (!phone?.trim())      return sendError(res, 400, 'Phone number is required.');
    if (!['nysc', 'graduate'].includes(category?.toLowerCase()))
      return sendError(res, 400, "Category must be 'nysc' or 'graduate'.");
    if (!password || password.length < 8)
      return sendError(res, 400, 'Password must be at least 8 characters.');

    const existing = await Registration.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return sendError(res, 409, 'An account with this email already exists.');

    const files = req.files || {};
    if (files.photo)        staged.push(files.photo[0].path);
    if (files.statement)    staged.push(files.statement[0].path);
    if (files.callUpLetter) staged.push(files.callUpLetter[0].path);
    if (files.paymentProof) staged.push(files.paymentProof[0].path);

    const registrationId = generateRegistrationId();
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Move files from staging to final directory ──────────────────────
    const fileRecord = { photo: null, statement: null, callUpLetter: null, paymentProof: null };

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

    // ── Upload files to Telegram (non-blocking — failures use local fallback) ─
    const telegramFileIds = await uploadFilesToTelegram(registrationId, fileRecord, fullName.trim());
    const storedOnTelegram = Object.values(telegramFileIds).some(id => !!id);

    let assessmentAnswers = [];
    try {
      const raw = req.body.assessmentAnswers;
      if (raw) assessmentAnswers = JSON.parse(raw);
    } catch (_) {}

    const record = await Registration.create({
      registrationId,
      fullName:             fullName.trim(),
      email:                email.trim().toLowerCase(),
      phone:                phone.trim(),
      category:             category.toLowerCase(),
      password:             hashedPassword,
      status:               'pending',
      submittedAt:          new Date(),
      assessmentScore:      req.body.assessmentScore      ? Number(req.body.assessmentScore)      : undefined,
      assessmentTotal:      req.body.assessmentTotal      ? Number(req.body.assessmentTotal)      : undefined,
      assessmentPercentage: req.body.assessmentPercentage ? Number(req.body.assessmentPercentage) : undefined,
      assessmentLevel:      req.body.assessmentLevel      || undefined,
      assessmentAnswers,
      files:           fileRecord,
      telegramFileIds, // null for any field that failed or wasn't uploaded
      storedOnTelegram,
    });

    // Fire-and-forget — don't block the response on the email send
    emailService.sendRegistrationConfirmation({
      to:             record.email,
      fullName:       record.fullName,
      registrationId: record.registrationId,
    }).catch(err => console.warn('[Email] Confirmation email failed:', err.message));

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
      .select('+password');

    if (!student) return sendError(res, 401, 'Invalid email or password.');

    const match = await bcrypt.compare(password, student.password);
    if (!match)  return sendError(res, 401, 'Invalid email or password.');

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
// ─────────────────────────────────────────────────────────────────────────────

module.exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Registration.findOne({
      $or: [{ registrationId: id }, { _id: id.match(/^[a-f\d]{24}$/i) ? id : undefined }],
    });
    if (!student) return sendError(res, 404, 'Registration not found.');
    return res.json({ success: true, data: student });
  } catch (err) {
    console.error('[getStudent]', err);
    return sendError(res, 500, 'Could not retrieve registration.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/registration/update/:id
// ─────────────────────────────────────────────────────────────────────────────

module.exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'student' && req.user.registrationId !== id)
      return sendError(res, 403, 'You can only update your own profile.');

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
//
//  Serves a registration file. Checks in this order:
//    1. If the file has a Telegram fileId → proxy stream from Telegram
//    2. If the file exists on local disk   → serve directly
//    3. Neither                            → 404
//
//  Auth: Bearer token required (admin or own registrationId).
// ─────────────────────────────────────────────────────────────────────────────

module.exports.serveFile = async (req, res) => {
  try {
    const { id, filename } = req.params;

    const safeName = path.basename(filename);
    if (safeName !== filename) return sendError(res, 400, 'Invalid filename.');

    const student = await Registration.findOne({ registrationId: id });
    if (!student) return sendError(res, 404, 'Registration not found.');

    // Verify the requested filename belongs to this registration
    const registeredFiles = Object.values(student.files || {});
    if (!registeredFiles.includes(safeName)) return sendError(res, 404, 'File not found.');

    // Auth check
    if (req.user?.role !== 'admin' && req.user?.registrationId !== id)
      return sendError(res, 403, 'Access denied.');

    // ── Find which field this filename belongs to ─────────────────────────
    const fieldEntry = Object.entries(student.files || {}).find(([, v]) => v === safeName);
    const field      = fieldEntry?.[0]; // 'photo' | 'statement' | 'callUpLetter' | 'paymentProof'

    // ── 1. Try Telegram first ─────────────────────────────────────────────
    if (field && student.telegramFileIds?.[field]) {
      try {
        const ext  = path.extname(safeName).toLowerCase();
        const mime = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.png': 'image/png',  '.webp': 'image/webp',
          '.pdf': 'application/pdf',
        }[ext] || 'application/octet-stream';

        // Stream from Telegram via proxy — bot token never sent to browser
        const downloadUrl = await telegram.getDownloadUrl(student.telegramFileIds[field]);

        return new Promise((resolve, reject) => {
          https.get(downloadUrl, tgRes => {
            res.setHeader('Content-Type',   mime);
            res.setHeader('Cache-Control',  'private, max-age=300'); // 5-min browser cache
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (tgRes.headers['content-length'])
              res.setHeader('Content-Length', tgRes.headers['content-length']);
            tgRes.pipe(res);
            tgRes.on('end',   resolve);
            tgRes.on('error', reject);
          }).on('error', reject);
        });
      } catch (tgErr) {
        // Telegram fetch failed — fall through to local disk
        console.warn(`[serveFile] Telegram fetch failed for ${id}/${field}, trying disk:`, tgErr.message);
      }
    }

    // ── 2. Local disk fallback ────────────────────────────────────────────
    const filePath = path.join(UPLOAD_ROOT, id, safeName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, 'File not found on disk.');
    return res.sendFile(filePath);

  } catch (err) {
    console.error('[serveFile]', err);
    return sendError(res, 500, 'Could not serve file.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/registration/:id/file-token/:filename
//  Returns a signed 5-minute URL the browser can open directly.
// ─────────────────────────────────────────────────────────────────────────────

module.exports.getFileToken = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const safeName = path.basename(filename);

    const student = await Registration.findOne({ registrationId: id });
    if (!student) return sendError(res, 404, 'Registration not found.');

    const registeredFiles = Object.values(student.files || {});
    if (!registeredFiles.includes(safeName)) return sendError(res, 404, 'File not found.');

    if (req.user?.role !== 'admin' && req.user?.registrationId !== id)
      return sendError(res, 403, 'Access denied.');

    const fileToken = generateFileToken(id, safeName);
    const base = (process.env.API_BASE_URL || '').replace(/\/$/, '');
    const url  = `${base}/api/registration/file?token=${fileToken}`;

    return res.json({ success: true, url });
  } catch (err) {
    console.error('[getFileToken]', err);
    return sendError(res, 500, 'Could not generate file token.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/registration/file?token=<signed-token>
//  Public — token is the auth. Used for "Open in New Tab" and "Download".
// ─────────────────────────────────────────────────────────────────────────────

module.exports.serveFileByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return sendError(res, 401, 'No token provided.');

    const payload = verifyToken(token);
    if (!payload || payload.purpose !== 'file-access')
      return sendError(res, 401, 'Invalid or expired file token.');

    const { registrationId, filename } = payload;
    const safeName = path.basename(filename);

    const student = await Registration.findOne({ registrationId });
    if (!student) return sendError(res, 404, 'Registration not found.');

    const registeredFiles = Object.values(student.files || {});
    if (!registeredFiles.includes(safeName)) return sendError(res, 404, 'File not found.');

    // ── Find field and try Telegram first ─────────────────────────────────
    const fieldEntry = Object.entries(student.files || {}).find(([, v]) => v === safeName);
    const field      = fieldEntry?.[0];

    if (field && student.telegramFileIds?.[field]) {
      try {
        const ext  = path.extname(safeName).toLowerCase();
        const mime = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.png': 'image/png',  '.webp': 'image/webp',
          '.pdf': 'application/pdf',
        }[ext] || 'application/octet-stream';

        const downloadUrl = await telegram.getDownloadUrl(student.telegramFileIds[field]);

        return new Promise((resolve, reject) => {
          https.get(downloadUrl, tgRes => {
            res.setHeader('Content-Type',  mime);
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (tgRes.headers['content-length'])
              res.setHeader('Content-Length', tgRes.headers['content-length']);
            tgRes.pipe(res);
            tgRes.on('end',   resolve);
            tgRes.on('error', reject);
          }).on('error', reject);
        });
      } catch (tgErr) {
        console.warn(`[serveFileByToken] Telegram fetch failed, trying disk:`, tgErr.message);
      }
    }

    // ── Local disk fallback ───────────────────────────────────────────────
    const filePath = path.join(UPLOAD_ROOT, registrationId, safeName);
    if (!fs.existsSync(filePath)) return sendError(res, 404, 'File not found on disk.');
    return res.sendFile(filePath);

  } catch (err) {
    console.error('[serveFileByToken]', err);
    return sendError(res, 500, 'Could not serve file.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — GET /api/admin/registrations
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminGetAll = async (req, res) => {
  try {
    const registrations = await Registration.find()
      .select('-password')
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
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status))
      return sendError(res, 400, "Status must be 'pending', 'approved', or 'rejected'.");

    if (status === 'rejected' && !rejectionReason?.trim())
      return sendError(res, 400, 'A rejection reason is required when rejecting an application.');

    const update = { status };
    if (status === 'rejected') update.rejectionReason = rejectionReason.trim();
    else update.rejectionReason = null;

    const student = await Registration.findOneAndUpdate(
      { registrationId: id },
      { $set: update },
      { new: true }
    ).select('-password');

    if (!student) return sendError(res, 404, 'Registration not found.');

    // Fire-and-forget — don't block the response on the email send
    emailService.sendStatusUpdate({
      to:               student.email,
      fullName:         student.fullName,
      registrationId:   student.registrationId,
      status:           student.status,
      rejectionReason:  student.rejectionReason,
    }).catch(err => console.warn('[Email] Status email failed:', err.message));

    return res.json({
      success: true,
      message: `Status updated to '${status}'.`,
      data: {
        registrationId:  student.registrationId,
        status:          student.status,
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
// ─────────────────────────────────────────────────────────────────────────────

module.exports.adminDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Registration.findOneAndDelete({ registrationId: id });
    if (!student) return sendError(res, 404, 'Registration not found.');

    const dir = path.join(UPLOAD_ROOT, id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

    return res.json({ success: true, message: 'Registration deleted.' });
  } catch (err) {
    console.error('[adminDelete]', err);
    return sendError(res, 500, 'Delete failed.');
  }
};