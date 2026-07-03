const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

/**
 * برفع صورة واحدة (buffer) على Cloudinary وبيرجع بيانات الصورة المرفوعة
 * @param {Buffer} fileBuffer - محتوى الصورة
 * @param {String} folder - اسم الفولدر في Cloudinary
 * @returns {Promise<{url: String, publicId: String}>}
 */
const uploadBufferToCloudinary = (fileBuffer, folder = 'plant-store') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // تصغير وضغط تلقائي مع الحفاظ على جودة معقولة
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * برفع كذا صورة مع بعض بالتوازي
 * @param {Array<Express.Multer.File>} files
 * @param {String} folder
 * @returns {Promise<String[]>} - array من الروابط (URLs) بس، ودي اللي بتتخزن في قاعدة البيانات
 */
const uploadImagesToCloudinary = async (files, folder = 'plant-store') => {
  const uploads = await Promise.all(
    files.map((file) => uploadBufferToCloudinary(file.buffer, folder))
  );
  return uploads.map((u) => u.url);
};

/**
 * حذف صورة من Cloudinary باستخدام الرابط المخزن (بنستخرج منه الـ public_id)
 * @param {String} imageUrl
 */
const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    // مثال على رابط Cloudinary:
    // https://res.cloudinary.com/xxx/image/upload/v123456/plant-store/abc123.jpg
    const parts = imageUrl.split('/');
    const fileName = parts.pop().split('.')[0]; // abc123
    const folder = parts.slice(parts.indexOf('upload') + 2).join('/'); // plant-store
    const publicId = folder ? `${folder}/${fileName}` : fileName;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('⚠️ فشل حذف الصورة من Cloudinary:', err.message);
  }
};

module.exports = {
  uploadBufferToCloudinary,
  uploadImagesToCloudinary,
  deleteImageFromCloudinary,
};
