const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المنتج مطلوب'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'وصف المنتج مطلوب'],
    },
    category: {
      type: String,
      required: [true, 'التصنيف مطلوب'],
      enum: {
        values: ['plant-disease-treatment', 'plant-tools', 'seeds', 'fertilizers'],
        message:
          'التصنيف يجب أن يكون واحد من: plant-disease-treatment, plant-tools, seeds, fertilizers',
      },
    },
    subCategory: {
      type: String, // مثال: مبيد فطري، مبيد حشري، أدوات تقليم، بذور خضروات ...
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'السعر مطلوب'],
      min: [0, 'السعر لا يمكن أن يكون سالب'],
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, 'الكمية المتاحة مطلوبة'],
      min: 0,
      default: 0,
    },
    unit: {
      type: String, // كجم، لتر، قطعة، علبة ...
      default: 'قطعة',
    },
    brand: {
      type: String,
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
    // هل المنتج يحتاج وصفة/إرشادات استخدام آمنة (خاص بمواد العلاج)
    usageInstructions: {
      type: String,
    },
    activeIngredient: {
      type: String, // المادة الفعالة، مهم لمبيدات علاج الأمراض
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
