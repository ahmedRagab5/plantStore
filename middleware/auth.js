const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/appError');

// حماية الراوت: لازم يكون المستخدم مسجل دخول
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(
      new AppError('غير مصرح لك بالدخول، سجل الدخول أولاً', 401)
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('التوكن غير صالح أو منتهي الصلاحية', 401));
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('المستخدم صاحب هذا التوكن لم يعد موجود', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('هذا الحساب موقوف حالياً', 403));
  }

  req.user = currentUser;
  next();
});

// السماح فقط لأدوار معينة (مثال: 'merchant', 'admin')
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('ليس لديك صلاحية للقيام بهذا الإجراء', 403)
      );
    }
    next();
  };
};
