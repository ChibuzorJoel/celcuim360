/**
 * routes/registration.routes.js - Registration API Routes
 */

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { upload } = require('../middleware/upload.middleware');
const { validateRegistration } = require('../middleware/validation.middleware');



/**
 * ✅ LOGIN ROUTE
 */
router.post('/login', registrationController.login);

/**
 * ✅ SUBMIT REGISTRATION
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
 * ✅ GET BY EMAIL
 * Must be placed BEFORE /:id to prevent "email" being treated as an ID
 */
router.get('/email/:email', registrationController.getRegistrationByEmail);

/**
 * ✅ GET ALL (Admin)
 */
router.get('/', registrationController.getAllRegistrations);

/**
 * ✅ GET BY ID
 */
router.get('/:id', registrationController.getRegistration);

/**
 * ✅ VERIFICATION & STATUS UPDATES
 */
router.patch('/:id/verify', registrationController.updateVerificationStatus);
router.patch('/:id/status', registrationController.updateVerificationStatus);

/**
 * ✅ SERVE FILES
 */
router.get('/:id/file/:filename', registrationController.serveFile);

/**
 * ✅ DELETE REGISTRATION
 */
router.delete('/:id', registrationController.deleteRegistration);

module.exports = router;