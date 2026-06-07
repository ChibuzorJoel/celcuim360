/**
 * routes/student.routes.js
 *
 * Mounted at /api in server.js:
 *   app.use('/api', require('./routes/student.routes'));
 *
 * Resulting endpoints:
 *   GET  /api/student/:registrationId/progress
 *   POST /api/coursework
 *   POST /api/final-exam
 */

const express    = require('express');
const router     = express.Router();

// ── Use the EXACT filename of your controller (with 's' at the end) ────────
const controller = require('../controllers/coursework-question.controller');

// Student progress — called by student dashboard on every load
router.get('/student/:registrationId/progress', controller.getStudentProgress);

// Student submits coursework answers for a week
router.post('/coursework', controller.submitCoursework);

// Student submits final exam
router.post('/final-exam', controller.submitFinalExam);

module.exports = router;