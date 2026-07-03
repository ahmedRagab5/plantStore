const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `قيمة غير صحيحة لـ ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `القيمة "${err.keyValue[field]}" مستخدمة بالفعل في الحقل ${field}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `بيانات غير صحيحة: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('التوكن غير صالح، سجل الدخول مرة أخرى', 401);

const handleJWTExpiredError = () =>
  new AppError('انتهت صلاحية الجلسة، سجل الدخول مرة أخرى', 401);

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err, message: err.message };

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  res.status(error.statusCode || 500).json({
    status: error.status || 'error',
    message: error.message || 'حدث خطأ ما، حاول مرة أخرى لاحقاً',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
