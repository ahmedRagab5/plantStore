const express = require('express');
const {
  createCheckoutSession,
  stripeWebhook,
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ملحوظة: راوت الـ webhook بيتسجل في server.js لوحده بـ express.raw()
// عشان stripe محتاج الـ body خام (raw) عشان يتحقق من التوقيع
router.post(
  '/checkout-session',
  protect,
  restrictTo('user', 'admin'),
  createCheckoutSession
);

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
