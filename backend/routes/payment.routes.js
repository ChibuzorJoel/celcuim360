const express = require('express');
const router = express.Router();
import { 
  getPayments, 
  getPaymentStats, 
  updatePaymentStatus, 
  requestReceipt 
} from '../controllers/payment.controller';



router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.patch('/:id/status', updatePaymentStatus);
router.post('/:id/request-receipt', requestReceipt);

export default router;