/**
 * routes/registration.routes.js - Registration API Routes (UPDATED FULL CODE)
 */

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { upload } = require('../middleware/upload.middleware');
const { validateRegistration } = require('../middleware/validation.middleware');

/**
 * POST /api/registration/submit
 * Submit complete registration form with all files
 */
router.post(
  '/submit',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'statement', maxCount: 1 },
    { name: 'callUpLetter', maxCount: 1 },
    { name: 'paymentProof', maxCount: 1 }
  ]),
  validateRegistration,
  registrationController.submitRegistration
);

/**
 * GET /api/registration/email/:email
 * Retrieve a registration by email
 * IMPORTANT: place BEFORE /:id route
 */
router.get('/email/:email', registrationController.getRegistrationByEmail);

/**
 * GET /api/registration
 * Get all registrations (admin only)
 */
router.get('/', registrationController.getAllRegistrations);

/**
 * GET /api/registration/:id
 * Retrieve a registration by ID
 */
router.get('/:id', registrationController.getRegistration);

/**
 * PATCH /api/registration/:id/verify
 * Existing verification route
 */
router.patch('/:id/verify', registrationController.updateVerificationStatus);

/**
 * PATCH /api/registration/:id/status
 * NEW alias route used by admin UI
 */
router.patch('/:id/status', registrationController.updateVerificationStatus);

/**
 * GET /api/registration/:id/file/:filename
 * NEW route for serving uploaded files to admin viewer
 */
router.get('/:id/file/:filename', registrationController.serveFile);

/**
 * DELETE /api/registration/:id
 * Delete a registration
 */
router.delete('/:id', registrationController.deleteRegistration);

module.exports = router;