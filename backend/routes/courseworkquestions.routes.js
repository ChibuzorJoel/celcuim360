/**
 * routes/coursework-questions.routes.js
 * Wires controller methods to HTTP endpoints
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/coursework-question.controller');

// ── Admin routes ───────────────────────────────────────────────────────────

// GET  /api/coursework-questions              → all 6 weeks (admin summary)
router.get('/', controller.getAllWeeks);

// GET  /api/coursework-questions/:week        → single week full detail (admin)
router.get('/:week(\\d+)', controller.getWeek);

// GET  /api/coursework-questions/:week/student → published week only (student)
router.get('/:week(\\d+)/student', controller.getWeekForStudent);

// PUT  /api/coursework-questions/:week        → create or fully replace
router.put('/:week(\\d+)', controller.upsertWeek);

// PATCH /api/coursework-questions/:week       → partial update (title/instruction/single Q)
router.patch('/:week(\\d+)', controller.patchWeek);

// PATCH /api/coursework-questions/:week/publish → publish or unpublish
router.patch('/:week(\\d+)/publish', controller.setPublishStatus);

// DELETE /api/coursework-questions/:week      → reset week to empty
router.delete('/:week(\\d+)', controller.deleteWeek);

module.exports = router;