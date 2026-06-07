/**
 * routes/finalexam.routes.js
 * POST /api/final-exam
 */
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/coursework-question.controller');

router.post('/', controller.submitFinalExam);

module.exports = router;