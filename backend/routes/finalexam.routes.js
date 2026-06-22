/**
 * routes/finalexam.routes.js
 *
 * Mounted in server.js as:
 *   app.use('/api/final-exam', require('./routes/finalexam.routes'));
 *
 * Endpoints:
 *   POST  /api/final-exam           → student submits 40-question exam
 *   GET   /api/final-exam/status    → get publish toggle state (admin + student progress)
 *   PATCH /api/final-exam/publish   → admin publishes / unpublishes the exam
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/coursework-question.controller');

// IMPORTANT: static routes (/status, /publish) MUST come before any
// param routes, and before the root POST, to prevent Express swallowing them.

// GET  /api/final-exam/status
router.get('/status', controller.getFinalExamStatus);

// PATCH /api/final-exam/publish   body: { publish: boolean, publishedBy?: string }
router.patch('/publish', controller.setFinalExamPublishStatus);

// POST /api/final-exam   — student submits answers
router.post('/', controller.submitFinalExam);

module.exports = router;