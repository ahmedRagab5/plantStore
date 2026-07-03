const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/appError');

// @desc    عرض سلة المستخدم الحالي
// @route   GET /api/v1/cart
// @access  Private/User
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate(
    'items.product',
    'name images price stock category'
  );

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    إضافة منتج للسلة
// @route   POST /api/v1/cart
// @access  Private/User
exports.addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  if (product.stock < quantity) {
    return next(new AppError('الكمية المطلوبة غير متوفرة في المخزون', 400));
  }

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.discountPrice || product.price,
    });
  }

  await cart.save();
  await cart.populate('items.product', 'name images price stock');

  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    تحديث كمية منتج في السلة
// @route   PATCH /api/v1/cart/:productId
// @access  Private/User
exports.updateCartItem = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!quantity || quantity < 1) {
    return next(new AppError('الكمية يجب أن تكون 1 على الأقل', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('السلة غير موجودة', 404));
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    return next(new AppError('المنتج غير موجود في السلة', 404));
  }

  item.quantity = quantity;
  await cart.save();
  await cart.populate('items.product', 'name images price stock');

  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    حذف منتج من السلة
// @route   DELETE /api/v1/cart/:productId
// @access  Private/User
exports.removeFromCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('السلة غير موجودة', 404));
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );

  await cart.save();

  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    تفريغ السلة بالكامل
// @route   DELETE /api/v1/cart
// @access  Private/User
exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user.id },
    { items: [], totalPrice: 0 }
  );

  res.status(200).json({ status: 'success', message: 'تم تفريغ السلة' });
});
