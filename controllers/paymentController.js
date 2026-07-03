const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const AppError = require('../utils/appError');
const { buildOrderFromCart } = require('./orderController');

// @desc    إنشاء جلسة دفع Stripe Checkout بناءً على السلة
// @route   POST /api/v1/payment/checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { shippingAddress } = req.body;

  if (!shippingAddress || !shippingAddress.city || !shippingAddress.phone) {
    return next(new AppError('عنوان الشحن ورقم الهاتف مطلوبين', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id }).populate(
    'items.product'
  );

  if (!cart || cart.items.length === 0) {
    return next(new AppError('السلة فارغة', 400));
  }

  const lineItems = cart.items.map((item) => ({
    price_data: {
      currency: 'egp',
      product_data: {
        name: item.product.name,
        images: item.product.images?.length ? [item.product.images[0]] : [],
      },
      unit_amount: Math.round(item.price * 100), // Stripe بياخد المبلغ بالقرش/السنت
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    customer_email: req.user.email,
    success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cart`,
    metadata: {
      userId: req.user.id,
      shippingAddress: JSON.stringify(shippingAddress),
    },
  });

  res.status(200).json({ status: 'success', data: { url: session.url, id: session.id } });
});

// @desc    Webhook من Stripe لتأكيد الدفع وإنشاء الطلب فعلياً
// @route   POST /api/v1/payment/webhook
// @access  Public (Stripe فقط عبر التوقيع)
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const shippingAddress = JSON.parse(session.metadata.shippingAddress);

    const order = await buildOrderFromCart(userId, shippingAddress, 'card');
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: session.id,
      status: session.payment_status,
      email: session.customer_email,
    };
    order.orderStatus = 'processing';
    await order.save();
  }

  res.status(200).json({ received: true });
});
