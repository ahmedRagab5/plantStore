const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/appError');
const generateToken = require('../utils/generateToken');

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('token', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// @desc    تسجيل مستخدم جديد (يوزر أو تاجر)
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, role, storeName, address } = req.body;

  // منع أي حد يسجل كـ admin من غير صلاحية
  const allowedRole = role === 'merchant' ? 'merchant' : 'user';

  if (allowedRole === 'merchant' && !storeName) {
    return next(new AppError('اسم المتجر مطلوب للتجار', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    address,
    role: allowedRole,
    storeName: allowedRole === 'merchant' ? storeName : undefined,
  });

  sendTokenResponse(user, 201, res);
});

// @desc    تسجيل الدخول
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('من فضلك أدخل البريد الإلكتروني وكلمة المرور', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401));
  }

  if (!user.isActive) {
    return next(new AppError('هذا الحساب موقوف حالياً', 403));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    تسجيل الخروج
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج' });
});

// @desc    بيانات المستخدم الحالي
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { user: req.user } });
});

// @desc    تحديث بيانات المستخدم الحالي
// @route   PATCH /api/v1/auth/update-me
// @access  Private
exports.updateMe = asyncHandler(async (req, res, next) => {
  const disallowedFields = ['password', 'role', 'email'];
  disallowedFields.forEach((field) => delete req.body[field]);

  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

// @desc    تغيير كلمة المرور
// @route   PATCH /api/v1/auth/update-password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('كلمة المرور الحالية غير صحيحة', 401));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});
