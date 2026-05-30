/**
 * routes/cohort.routes.js
 * Wires cohort controller to HTTP endpoints
 *
 * Mount in server.js:
 *   const cohortRoutes = require('./routes/cohort.routes');
 *   app.use('/api/cohorts', cohortRoutes);
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/cohort.controller');

// GET    /api/cohorts              → all cohorts (optional ?status=active)
router.get('/',              controller.getAllCohorts);

// GET    /api/cohorts/:id          → single cohort with live stats
router.get('/:id',           controller.getCohort);

// GET    /api/cohorts/:id/calendar → weeks array only
router.get('/:id/calendar',  controller.getCalendar);

// POST   /api/cohorts              → create new cohort
router.post('/',             controller.createCohort);

// PATCH  /api/cohorts/:id          → update name/dates/status
router.patch('/:id',         controller.updateCohort);

// PATCH  /api/cohorts/:id/archive  → set status = closed
router.patch('/:id/archive', controller.archiveCohort);

// PATCH  /api/cohorts/:id/refresh-stats → sync enrollment counts
router.patch('/:id/refresh-stats', controller.refreshStats);

// DELETE /api/cohorts/:id          → hard delete (admin only)
router.delete('/:id',        controller.deleteCohort);

module.exports = router;