const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  addProductImages,
  deleteProductImage,
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// عام - لأي حد
router.get('/', getProducts);

// خاص بالتاجر - لازم يكون قبل /:id عشان my-products ميتفسرش كـ id
router.get(
  '/my-products',
  protect,
  restrictTo('merchant', 'admin'),
  getMyProducts
);

router.get('/:id', getProduct);

// إنشاء منتج - ممكن يترفق معاه صور مباشرة (form-data: field name = images, حتى 5 صور)
router.post(
  '/',
  protect,
  restrictTo('merchant', 'admin'),
  upload.array('images', 5),
  createProduct
);

router.patch('/:id', protect, restrictTo('merchant', 'admin'), updateProduct);
router.delete('/:id', protect, restrictTo('merchant', 'admin'), deleteProduct);

// إدارة صور منتج موجود بالفعل
router.post(
  '/:id/images',
  protect,
  restrictTo('merchant', 'admin'),
  upload.array('images', 5),
  addProductImages
);
router.delete(
  '/:id/images',
  protect,
  restrictTo('merchant', 'admin'),
  deleteProductImage
);

module.exports = router;
