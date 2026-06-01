// routes/admin.routes.js

'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/registration.controller');

// Every route in this file requires a valid admin JWT
router.use(ctrl.requireAuth, ctrl.requireAdmin);

// GET    /api/admin/registrations
router.get('/',              ctrl.adminGetAll);

// PATCH  /api/admin/registrations/:id/status
router.patch('/:id/status',  ctrl.adminUpdateStatus);

// DELETE /api/admin/registrations/:id
router.delete('/:id',        ctrl.adminDelete);

module.exports = router;