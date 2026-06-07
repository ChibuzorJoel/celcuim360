/**
 * routes/coursework-questions.routes.js
 * Wires controller methods to HTTP endpoints
 *
 * IMPORTANT — route order matters in Express:
 *   Static paths (/submissions, /submissions/grade) MUST come
 *   before param patterns (/:week) to avoid conflicts.
 */
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/coursework-question.controller');

// ── Admin — real submission data (STATIC routes first) ────────────────────

// GET  /api/coursework-questions/submissions
// GET  /api/coursework-questions/submissions?week=N   (1–6)
// GET  /api/coursework-questions/submissions?type=final
router.get('/submissions', controller.getAllSubmissions);

// PATCH /api/coursework-questions/submissions/grade
// Body: { registrationId, weekId (1-6 or "final"), score, feedback, gradedBy }
router.patch('/submissions/grade', controller.gradeSubmission);

// ── Admin — week question management (param routes after statics) ──────────

// GET  /api/coursework-questions              → all 6 weeks (admin summary)
router.get('/', controller.getAllWeeks);

// GET  /api/coursework-questions/:week        → single week full detail (admin)
router.get('/:week(\\d+)', controller.getWeek);

// GET  /api/coursework-questions/:week/student → published week only (student)
router.get('/:week(\\d+)/student', controller.getWeekForStudent);

// PUT  /api/coursework-questions/:week        → create or fully replace
router.put('/:week(\\d+)', controller.upsertWeek);

// PATCH /api/coursework-questions/:week/publish → publish or unpublish
// NOTE: must come before the generic /:week PATCH to avoid swallowing /publish
router.patch('/:week(\\d+)/publish', controller.setPublishStatus);

// PATCH /api/coursework-questions/:week       → partial update (title/instruction/single Q)
router.patch('/:week(\\d+)', controller.patchWeek);

// DELETE /api/coursework-questions/:week      → reset week to empty
router.delete('/:week(\\d+)', controller.deleteWeek);

module.exports = router;