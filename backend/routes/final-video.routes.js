/**
 * routes/final-video.routes.js
 *
 * Handles the mandatory final video submission gate.
 * Mounted in server.js as:
 *   app.use('/api/final-video', require('./routes/final-video.routes'));
 *
 * Endpoints:
 *   POST /api/final-video         → student uploads video (multipart/form-data)
 *   GET  /api/admin/final-videos  → admin lists all video submissions
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const mongoose = require('mongoose');

// ── Storage setup ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'final-videos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const regId = (req.body.registrationId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '');
    const ext   = path.extname(file.originalname) || '.mp4';
    cb(null, `${regId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed.'));
    }
    cb(null, true);
  },
});

// ── Model ─────────────────────────────────────────────────────────────────────
const FinalVideoSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true },
  studentName:    { type: String, default: '' },
  studentEmail:   { type: String, default: '' },
  videoFilename:  { type: String, required: true },
  videoUrl:       { type: String, required: true },
  consentGiven:   { type: Boolean, default: false },
  submittedAt:    { type: Date,   default: Date.now },
});

const FinalVideo = mongoose.models.FinalVideo || mongoose.model('FinalVideo', FinalVideoSchema);

// ── POST /api/final-video — student uploads ───────────────────────────────────
router.post('/', upload.single('video'), async (req, res) => {
  try {
    const { registrationId, studentName, studentEmail, consentGiven } = req.body;

    if (!registrationId) {
      return res.status(400).json({ message: 'registrationId is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No video file was uploaded.' });
    }
    if (consentGiven !== 'true') {
      return res.status(400).json({ message: 'Consent is required to submit your video.' });
    }

    const videoUrl = `/uploads/final-videos/${req.file.filename}`;

    const record = await FinalVideo.findOneAndUpdate(
      { registrationId },
      {
        registrationId,
        studentName:   studentName  || '',
        studentEmail:  studentEmail || '',
        videoFilename: req.file.filename,
        videoUrl,
        consentGiven:  true,
        submittedAt:   new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`[FinalVideo] ${registrationId} uploaded ${req.file.filename}`);

    res.json({
      success: true,
      message: 'Video submitted successfully.',
      videoUrl: record.videoUrl,
    });
  } catch (err) {
    console.error('[final-video upload]', err.message);
    res.status(500).json({ message: err.message || 'Failed to upload video.' });
  }
});

// ── GET /api/admin/final-videos — admin views all submissions ────────────────
router.get('/admin/all', async (req, res) => {
  try {
    const videos = await FinalVideo.find({}).sort({ submittedAt: -1 }).lean();
    res.json({ videos });
  } catch (err) {
    console.error('[final-video list]', err.message);
    res.status(500).json({ message: 'Failed to load video submissions.' });
  }
});

module.exports = router;