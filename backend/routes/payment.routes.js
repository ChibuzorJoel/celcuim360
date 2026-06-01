/**
 * routes/payment.routes.js
 * Wire in server.js:
 *   app.use('/api/payments', require('./routes/payment.routes'));
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/payment.controller');

// GET    /api/payments                           → all payments (admin, with filters)
router.get('/',                       controller.getAllPayments);

// GET    /api/payments/stats                     → summary stats for dashboard
router.get('/stats',                  controller.getStats);

// POST   /api/payments/sync                      → sync from registration proofFiles
router.post('/sync',                  controller.syncFromRegistrations);

// GET    /api/payments/:id                       → single payment
router.get('/:id',                    controller.getPayment);

// GET    /api/payments/registration/:regId       → all payments for one student
router.get('/registration/:registrationId', controller.getPaymentsByRegistration);

// POST   /api/payments                           → create new payment record
router.post('/',                      controller.createPayment);

// PATCH  /api/payments/:id                       → update amount/reference/notes
router.patch('/:id',                  controller.updatePayment);

// PATCH  /api/payments/:id/verify                → admin verifies payment
router.patch('/:id/verify',           controller.verifyPayment);

// PATCH  /api/payments/:id/reject                → admin rejects payment
router.patch('/:id/reject',           controller.rejectPayment);

// POST   /api/payments/:id/request-receipt       → email student asking for proof
router.post('/:id/request-receipt',   controller.requestReceipt);

// DELETE /api/payments/:id                       → hard delete
router.delete('/:id',                 controller.deletePayment);

module.exports = router;