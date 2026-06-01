// ─────────────────────────────────────────────────────────────────────────────
//  EXPRESS ROUTER wiring — paste into routes/registration.js
// ─────────────────────────────────────────────────────────────────────────────

 
const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/registration.controller');
 
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
