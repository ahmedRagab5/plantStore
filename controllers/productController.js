const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const {
  uploadImagesToCloudinary,
  deleteImageFromCloudinary,
} = require('../utils/cloudinaryUpload');

// @desc    عرض كل المنتجات (مع فلترة، بحث، ترتيب، تقسيم صفحات)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
  excludedFields.forEach((field) => delete queryObj[field]);

  // فلترة بالسعر: price[gte]=100
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  const filter = JSON.parse(queryStr);

  filter.isActive = true;

  if (req.query.keyword) {
    filter.$text = { $search: req.query.keyword };
  }

  let query = Product.find(filter).populate('merchant', 'name storeName');

  // الترتيب
  if (req.query.sort) {
    query = query.sort(req.query.sort.split(',').join(' '));
  } else {
    query = query.sort('-createdAt');
  }

  // اختيار حقول معينة
  if (req.query.fields) {
    query = query.select(req.query.fields.split(',').join(' '));
  }

  // تقسيم الصفحات
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const [products, total] = await Promise.all([
    query,
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: products.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: { products },
  });
});

// @desc    عرض منتج واحد
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    'merchant',
    'name storeName phone'
  );

  if (!product || !product.isActive) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  res.status(200).json({ status: 'success', data: { product } });
});

// @desc    إضافة منتج جديد (تاجر فقط) - ممكن يترفق معاها صور (multipart/form-data)
// @route   POST /api/v1/products
// @access  Private/Merchant
exports.createProduct = asyncHandler(async (req, res, next) => {
  req.body.merchant = req.user.id;

  // لو المستخدم رفع صور مع الطلب (حقل الفورم اسمه images)
  if (req.files && req.files.length > 0) {
    const imageUrls = await uploadImagesToCloudinary(
      req.files,
      'plant-store/products'
    );
    req.body.images = imageUrls; // بنخزن الروابط (paths) بس في قاعدة البيانات
  }

  const product = await Product.create(req.body);

  res.status(201).json({ status: 'success', data: { product } });
});

// @desc    تعديل منتج (صاحب المنتج التاجر فقط)
// @route   PATCH /api/v1/products/:id
// @access  Private/Merchant
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  if (
    product.merchant.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('غير مصرح لك بتعديل هذا المنتج', 403));
  }

  // منع تغيير صاحب المنتج
  delete req.body.merchant;

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({ status: 'success', data: { product: updatedProduct } });
});

// @desc    حذف منتج (صاحب المنتج التاجر فقط)
// @route   DELETE /api/v1/products/:id
// @access  Private/Merchant
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  if (
    product.merchant.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('غير مصرح لك بحذف هذا المنتج', 403));
  }

  await product.deleteOne();

  res.status(204).json({ status: 'success', data: null });
});

// @desc    إضافة صور لمنتج موجود (بترفع على Cloudinary ويتخزن الرابط بس)
// @route   POST /api/v1/products/:id/images
// @access  Private/Merchant (صاحب المنتج فقط)
exports.addProductImages = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  if (
    product.merchant.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('غير مصرح لك بتعديل صور هذا المنتج', 403));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('من فضلك ارفع صورة واحدة على الأقل', 400));
  }

  const imageUrls = await uploadImagesToCloudinary(
    req.files,
    'plant-store/products'
  );

  product.images.push(...imageUrls);
  await product.save();

  res.status(200).json({ status: 'success', data: { product } });
});

// @desc    حذف صورة واحدة من منتج (من Cloudinary ومن قاعدة البيانات)
// @route   DELETE /api/v1/products/:id/images
// @access  Private/Merchant (صاحب المنتج فقط)
exports.deleteProductImage = asyncHandler(async (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return next(new AppError('من فضلك حدد رابط الصورة المراد حذفها', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('المنتج غير موجود', 404));
  }

  if (
    product.merchant.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('غير مصرح لك بتعديل صور هذا المنتج', 403));
  }

  if (!product.images.includes(imageUrl)) {
    return next(new AppError('الصورة غير موجودة ضمن صور المنتج', 404));
  }

  await deleteImageFromCloudinary(imageUrl);

  product.images = product.images.filter((img) => img !== imageUrl);
  await product.save();

  res.status(200).json({ status: 'success', data: { product } });
});

// @desc    عرض منتجات التاجر الحالي (خاص بالتاجر لإدارة منتجاته)
// @route   GET /api/v1/products/my-products
// @access  Private/Merchant
exports.getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ merchant: req.user.id }).sort(
    '-createdAt'
  );

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products },
  });
});
