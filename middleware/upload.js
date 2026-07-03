const multer = require('multer');
const AppError = require('../utils/appError');

// بنستقبل الصورة في الذاكرة (buffer) عشان نرفعها لـ Cloudinary من غير ما نخزنها على السيرفر خالص
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('الملف المرفوع لازم يكون صورة فقط', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 ميجا لكل صورة
  },
});

module.exports = upload;
