const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('user', 'admin'));

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/', clearCart);
router.patch('/:productId', updateCartItem);
router.delete('/:productId', removeFromCart);

module.exports = router;
