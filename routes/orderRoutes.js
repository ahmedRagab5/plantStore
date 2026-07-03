const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrder,
  getMerchantOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// المستخدم (كاش عند الاستلام)
router.post('/', restrictTo('user', 'admin'), createOrder);
router.get('/my-orders', restrictTo('user', 'admin'), getMyOrders);

// التاجر
router.get(
  '/merchant-orders',
  restrictTo('merchant', 'admin'),
  getMerchantOrders
);
router.patch(
  '/:id/status',
  restrictTo('merchant', 'admin'),
  updateOrderStatus
);

// مشترك (المالك أو التاجر أو الأدمن - يتم التحقق داخل الكنترولر)
router.get('/:id', getOrder);

module.exports = router;
