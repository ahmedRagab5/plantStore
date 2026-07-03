const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/appError');
const { stripeWebhook } = require('./routes/paymentRoutes');

// الاتصال بقاعدة البيانات
connectDB();

const app = express();

// ⚠️ راوت الـ Stripe webhook لازم يكون قبل express.json()
// لأن Stripe محتاج الـ body خام (raw buffer) للتحقق من التوقيع
app.post(
  '/api/v1/payment/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// Middlewares عامة
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// حد أقصى للطلبات لمنع إساءة الاستخدام
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 300,
  message: 'طلبات كتير من الـ IP ده، حاول تاني بعد شوية',
});
app.use('/api', limiter);

// الراوتس
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/cart', require('./routes/cartRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));
app.use('/api/v1/payment', require('./routes/paymentRoutes'));

// فحص سريع لحالة السيرفر
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'السيرفر شغال تمام 🌱' });
});

// أي راوت مش موجود
app.all('*', (req, res, next) => {
  next(new AppError(`الرابط ${req.originalUrl} غير موجود على السيرفر`, 404));
});

// معالج الأخطاء المركزي (لازم يكون آخر middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت ${PORT} في وضع ${process.env.NODE_ENV}`);
});

// التعامل مع الأخطاء غير المتوقعة
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
