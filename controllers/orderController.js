const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/appError');

const SHIPPING_PRICE = 30; // سعر شحن ثابت، عدله حسب الحاجة

// دالة مشتركة لإنشاء الأوردر من السلة (نقدي)
const buildOrderFromCart = async (userId, shippingAddress, paymentMethod) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw new AppError('السلة فارغة', 400);
  }

  const orderItems = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      throw new AppError(`المنتج غير متاح حالياً`, 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`الكمية المطلوبة من "${product.name}" غير متوفرة`, 400);
    }
    orderItems.push({
      product: product._id,
      merchant: product.merchant,
      name: product.name,
      image: product.images?.[0] || '',
      price: item.price,
      quantity: item.quantity,
    });
  }

  const itemsPrice = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalPrice = itemsPrice + SHIPPING_PRICE;

  const order = await Order.create({
    user: userId,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice: SHIPPING_PRICE,
    totalPrice,
  });

  // تنقيص المخزون
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, soldCount: item.quantity },
    });
  }

  // تفريغ السلة
  cart.items = [];
  await cart.save();

  return order;
};

// @desc    إنشاء طلب بالدفع نقدي عند الاستلام
// @route   POST /api/v1/orders
// @access  Private/User
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { shippingAddress } = req.body;

  if (!shippingAddress || !shippingAddress.city || !shippingAddress.phone) {
    return next(new AppError('عنوان الشحن ورقم الهاتف مطلوبين', 400));
  }

  const order = await buildOrderFromCart(req.user.id, shippingAddress, 'cash');

  res.status(201).json({ status: 'success', data: { order } });
});

exports.buildOrderFromCart = buildOrderFromCart;

// @desc    عرض طلبات المستخدم الحالي
// @route   GET /api/v1/orders/my-orders
// @access  Private/User
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort('-createdAt');
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});

// @desc    عرض طلب واحد
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');

  if (!order) {
    return next(new AppError('الطلب غير موجود', 404));
  }

  const isOwner = order.user._id.toString() === req.user.id;
  const isMerchantOfOrder = order.orderItems.some(
    (item) => item.merchant.toString() === req.user.id
  );

  if (!isOwner && !isMerchantOfOrder && req.user.role !== 'admin') {
    return next(new AppError('غير مصرح لك بعرض هذا الطلب', 403));
  }

  res.status(200).json({ status: 'success', data: { order } });
});

// @desc    عرض الطلبات التي تحتوي على منتجات التاجر الحالي
// @route   GET /api/v1/orders/merchant-orders
// @access  Private/Merchant
exports.getMerchantOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    'orderItems.merchant': req.user.id,
  }).sort('-createdAt');

  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});

// @desc    تحديث حالة الطلب (تاجر/أدمن)
// @route   PATCH /api/v1/orders/:id/status
// @access  Private/Merchant
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderStatus } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(orderStatus)) {
    return next(new AppError('حالة الطلب غير صحيحة', 400));
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('الطلب غير موجود', 404));
  }

  const isMerchantOfOrder = order.orderItems.some(
    (item) => item.merchant.toString() === req.user.id
  );

  if (!isMerchantOfOrder && req.user.role !== 'admin') {
    return next(new AppError('غير مصرح لك بتحديث هذا الطلب', 403));
  }

  order.orderStatus = orderStatus;
  if (orderStatus === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  await order.save();

  res.status(200).json({ status: 'success', data: { order } });
});
