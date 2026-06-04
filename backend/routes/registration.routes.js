// routes/registration.routes.js

'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/registration.controller');

// ── Public ────────────────────────────────────────────────────────────────────
// Submit registration (multipart — multer runs first)
router.post(
  '/submit',
  ctrl.uploadMiddleware,
  ctrl.submitRegistration
);

// Public file access via short-lived signed token (used by Open in New Tab / Download)
// IMPORTANT: must be registered BEFORE the /:id param routes to avoid collision
router.get('/file', ctrl.serveFileByToken);

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

// Serve file with Bearer token (used by Angular HttpClient for in-app previews)
router.get(
  '/:id/file/:filename',
  ctrl.requireAuth,
  ctrl.serveFile
);

// Get a signed 5-min URL for a file (call this first, then open the returned URL)
router.get(
  '/:id/file-token/:filename',
  ctrl.requireAuth,
  ctrl.getFileToken
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