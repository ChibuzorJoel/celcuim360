/**
 * routes/final-video.routes.js
 *
 * POST /api/final-video          → student uploads video
 * GET  /api/final-video/stream/:registrationId  → admin/student streams video via proxy
 * GET  /api/final-video/admin/all → admin lists all video submissions
 *
 * Storage strategy:
 *   • If TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set in .env →
 *     upload to Telegram channel (permanent, survives Render redeploys).
 *     MongoDB stores: telegramFileId + telegramMessageId.
 *     videoUrl is set to  /api/final-video/stream/:registrationId  (our proxy).
 *
 *   • If Telegram is NOT configured → fall back to local disk (dev only).
 *     videoUrl is set to  /uploads/final-videos/:filename  (direct static file).
 *
 * ── SETUP ──────────────────────────────────────────────────────────────────
 *   1. @BotFather → /newbot → copy token
 *   2. Create private channel → add bot as Admin
 *   3. getUpdates to find chat id (negative number like -100xxxxxxxx)
 *   4. .env:
 *        TELEGRAM_BOT_TOKEN=123456:ABCdef...
 *        TELEGRAM_CHAT_ID=-100xxxxxxxxxx
 */

const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const mongoose  = require('mongoose');
const telegram  = require('../services/telegram.service');

// ── Multer — always save to disk first, then forward to Telegram ──────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'final-videos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Use registrationId so the file is identifiable even before DB write
    const regId = (req.body.registrationId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext   = path.extname(file.originalname) || '.mp4';
    cb(null, `${regId}-${Date.now()}${ext}`);
  },
});

// 49 MB to match Telegram's limit; show a clear message when exceeded
const MAX_SIZE = telegram.TELEGRAM_MAX_BYTES;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/'))
      return cb(new Error('Only video files are allowed (MP4, MOV, WebM, etc.).'));
    cb(null, true);
  },
});

// ── FinalVideo model ──────────────────────────────────────────────────────
const FinalVideoSchema = new mongoose.Schema({
  registrationId:    { type: String, required: true, unique: true },
  studentName:       { type: String, default: '' },
  studentEmail:      { type: String, default: '' },
  videoFilename:     { type: String, required: true },
  videoUrl:          { type: String, required: true },   // proxy URL or local path
  // Telegram storage (populated when Telegram is configured)
  telegramFileId:    { type: String, default: null },
  telegramMessageId: { type: Number, default: null },
  storedOnTelegram:  { type: Boolean, default: false },
  consentGiven:      { type: Boolean, default: false },
  submittedAt:       { type: Date,    default: Date.now },
});

const FinalVideo = mongoose.models.FinalVideo || mongoose.model('FinalVideo', FinalVideoSchema);

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/final-video   — student uploads their self-presentation video
// ══════════════════════════════════════════════════════════════════════════
router.post('/', upload.single('video'), async (req, res) => {
  const localFilePath = req.file?.path;

  try {
    const { registrationId, studentName, studentEmail, consentGiven } = req.body;

    if (!registrationId || registrationId === 'unknown') {
      if (localFilePath) fs.unlink(localFilePath, () => {});
      return res.status(400).json({ message: 'registrationId is required. Please refresh and try again.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No video file was uploaded.' });
    }
    if (consentGiven !== 'true') {
      if (localFilePath) fs.unlink(localFilePath, () => {});
      return res.status(400).json({ message: 'Consent is required to submit your video.' });
    }

    let videoUrl          = `/uploads/final-videos/${req.file.filename}`;
    let telegramFileId    = null;
    let telegramMessageId = null;
    let storedOnTelegram  = false;

    // ── Upload to Telegram if configured ─────────────────────────────────
    if (telegram.isConfigured()) {
      try {
        const caption = `📹 ${studentName || registrationId}\n📧 ${studentEmail || '—'}\n🆔 ${registrationId}`;
        const tg      = await telegram.sendVideo(localFilePath, caption);

        telegramFileId    = tg.fileId;
        telegramMessageId = tg.messageId;
        storedOnTelegram  = true;

        // Proxy URL — streams through our backend so the bot token stays private
        videoUrl = `/api/final-video/stream/${encodeURIComponent(registrationId)}`;

        // Clean up local disk copy — no longer needed
        fs.unlink(localFilePath, err => {
          if (err) console.warn('[FinalVideo] Could not delete temp file:', err.message);
        });

        console.log(`[FinalVideo] ${registrationId} → Telegram ✓ file_id=${telegramFileId}`);
      } catch (tgErr) {
        // Telegram upload failed — keep the local file as fallback
        console.error('[FinalVideo] Telegram upload failed, keeping local file:', tgErr.message);
        videoUrl = `/uploads/final-videos/${req.file.filename}`;
      }
    } else {
      console.log('[FinalVideo] Telegram not configured — storing locally (dev mode)');
    }

    // If the student already has a record, delete the old Telegram message first
    const existing = await FinalVideo.findOne({ registrationId });
    if (existing?.storedOnTelegram && existing?.telegramMessageId) {
      telegram.deleteMessage(existing.telegramMessageId).catch(() => {});
    }

    // Upsert the record
    const record = await FinalVideo.findOneAndUpdate(
      { registrationId },
      {
        registrationId,
        studentName:       studentName  || '',
        studentEmail:      studentEmail || '',
        videoFilename:     req.file.filename,
        videoUrl,
        telegramFileId,
        telegramMessageId,
        storedOnTelegram,
        consentGiven:      true,
        submittedAt:       new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success:  true,
      message:  'Video submitted successfully.',
      videoUrl: record.videoUrl,
    });
  } catch (err) {
    // Clean up temp file on any unhandled error
    if (localFilePath) fs.unlink(localFilePath, () => {});
    console.error('[final-video upload]', err.message);
    res.status(500).json({ message: err.message || 'Failed to upload video.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/final-video/stream/:registrationId
//  Proxy — streams the video from Telegram without exposing the bot token.
//  Supports Range requests so the browser <video> element can seek.
// ══════════════════════════════════════════════════════════════════════════
router.get('/stream/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params;
    const record = await FinalVideo.findOne({ registrationId }).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Video submission not found.' });
    }

    if (record.storedOnTelegram && record.telegramFileId) {
      // Determine MIME type from original filename extension
      const ext = path.extname(record.videoFilename || '').toLowerCase();
      const mime = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.avi': 'video/x-msvideo' }[ext] || 'video/mp4';

      await telegram.streamToResponse(record.telegramFileId, req, res, mime);
    } else {
      // Fallback — file is on local disk (dev mode)
      const localPath = path.join(__dirname, '..', 'uploads', 'final-videos', record.videoFilename);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ success: false, message: 'Video file not found on disk.' });
      }
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(localPath);
    }
  } catch (err) {
    console.error('[final-video stream]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to stream video.' });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/final-video/admin/all   — admin lists all video submissions
// ══════════════════════════════════════════════════════════════════════════
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