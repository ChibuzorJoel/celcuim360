/**
 * routes/registration.routes.js
 */

const express = require('express');
const router = express.Router();

const registrationController = require('../controllers/registration.controller');
const { upload } = require('../middleware/upload.middleware');
const { validateRegistration } = require('../middleware/validation.middleware');

// ==================== REGISTRATION ROUTES ====================

// Submit Registration (with file uploads)
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

// Get Registration by Email
router.get('/email/:email', registrationController.getRegistrationByEmail);

// Get All Registrations (Admin only)
router.get('/', registrationController.getAllRegistrations);

// Get Single Registration by ID
router.get('/:id', registrationController.getRegistration);

// Update Verification Status
router.patch('/:id/verify', registrationController.updateVerificationStatus);
router.patch('/:id/status', registrationController.updateVerificationStatus);

// Serve Uploaded Files
router.get('/:id/file/:filename', registrationController.serveFile);

module.exports = router;