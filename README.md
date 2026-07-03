# 🌱 Plant Store API

API لمتجر إلكتروني لبيع مواد علاج أمراض النبات، الأدوات الزراعية، والبذور.
مبني بـ **Node.js + Express + MongoDB (Mongoose)** مع نظام **JWT Authentication**
وجزء خاص بالمستخدم (Customer) وجزء خاص بالتاجر (Merchant).

## 🚀 التشغيل

```bash
npm install
cp .env.example .env   # عدّل القيم زي MONGO_URI و JWT_SECRET و Stripe keys
npm run dev             # للتطوير (nodemon)
npm start                # للإنتاج
```

السيرفر هيشتغل على `http://localhost:5000` (أو الـ PORT اللي في .env)

## 👥 الأدوار (Roles)

| الدور | الوصف |
|---|---|
| `user` | مستخدم عادي، بيتصفح المنتجات، يضيف للسلة، يعمل طلبات |
| `merchant` | تاجر، بيضيف/يعدل/يحذف منتجاته، ويدير الطلبات اللي فيها منتجاته |
| `admin` | صلاحيات كاملة (اختياري توسعته لاحقاً) |

عند التسجيل (`/api/v1/auth/register`) حدد `role: "user"` أو `role: "merchant"`.
لو تاجر، لازم تبعت `storeName` كمان.

## 📚 أهم الـ Endpoints

### Auth
| Method | Route | الوصف |
|---|---|---|
| POST | `/api/v1/auth/register` | تسجيل حساب جديد |
| POST | `/api/v1/auth/login` | تسجيل دخول |
| POST | `/api/v1/auth/logout` | تسجيل خروج |
| GET | `/api/v1/auth/me` | بيانات المستخدم الحالي |
| PATCH | `/api/v1/auth/update-me` | تعديل البيانات الشخصية |
| PATCH | `/api/v1/auth/update-password` | تغيير كلمة المرور |

### Products
| Method | Route | الوصف | صلاحية |
|---|---|---|---|
| GET | `/api/v1/products` | كل المنتجات (فلترة/بحث/ترتيب/صفحات) | عام |
| GET | `/api/v1/products/:id` | منتج واحد | عام |
| GET | `/api/v1/products/my-products` | منتجات التاجر الحالي | merchant |
| POST | `/api/v1/products` | إضافة منتج | merchant |
| PATCH | `/api/v1/products/:id` | تعديل منتج | merchant (صاحبه) |
| DELETE | `/api/v1/products/:id` | حذف منتج | merchant (صاحبه) |

**فلترة وبحث:**
```
GET /products?category=seeds
GET /products?price[gte]=50&price[lte]=200
GET /products?keyword=مبيد فطري
GET /products?sort=price&page=2&limit=10
```

**فئات المنتجات المتاحة (category):**
`plant-disease-treatment` (مواد علاج الأمراض) | `plant-tools` (أدوات) | `seeds` (بذور) | `fertilizers` (أسمدة)

### 🖼️ صور المنتجات (Cloudinary)

أي صورة بترفعها بتتخزن مباشرة على **Cloudinary**، وبيتخزن في الداتابيز **رابط الصورة (URL) بس** جوه حقل `images` في المنتج (مش الصورة نفسها).

| Method | Route | الوصف | صلاحية |
|---|---|---|---|
| POST | `/api/v1/products` | إنشاء منتج + رفع صور مباشرة (form-data) | merchant |
| POST | `/api/v1/products/:id/images` | إضافة صور لمنتج موجود | merchant (صاحبه) |
| DELETE | `/api/v1/products/:id/images` | حذف صورة معينة (بالرابط) `{ imageUrl }` | merchant (صاحبه) |

**طريقة الإرسال:** لازم يكون الـ request من نوع `multipart/form-data`، واسم الحقل بتاع الصور `images` (حتى 5 صور، حجم كل واحدة أقصاه 5 ميجا).

مثال باستخدام `curl`:
```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -F "name=مبيد فطري للعفن الأسود" \
  -F "description=يستخدم لعلاج أمراض الفطريات في النباتات" \
  -F "category=plant-disease-treatment" \
  -F "price=150" \
  -F "stock=50" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

ولازم تضيف مفاتيح Cloudinary في `.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
تقدر تجيبهم من [Cloudinary Dashboard](https://console.cloudinary.com/) بعد ما تعمل حساب مجاني.

### Cart (سلة)
| Method | Route | الوصف |
|---|---|---|
| GET | `/api/v1/cart` | عرض السلة |
| POST | `/api/v1/cart` | إضافة منتج `{ productId, quantity }` |
| PATCH | `/api/v1/cart/:productId` | تعديل الكمية `{ quantity }` |
| DELETE | `/api/v1/cart/:productId` | حذف منتج من السلة |
| DELETE | `/api/v1/cart` | تفريغ السلة بالكامل |

### Orders (طلبات)
| Method | Route | الوصف | صلاحية |
|---|---|---|---|
| POST | `/api/v1/orders` | إنشاء طلب (دفع كاش عند الاستلام) | user |
| GET | `/api/v1/orders/my-orders` | طلبات المستخدم الحالي | user |
| GET | `/api/v1/orders/merchant-orders` | الطلبات اللي فيها منتجات التاجر | merchant |
| GET | `/api/v1/orders/:id` | تفاصيل طلب | صاحبه/التاجر/أدمن |
| PATCH | `/api/v1/orders/:id/status` | تحديث حالة الطلب | merchant/admin |

### Payment (دفع أونلاين - Stripe)
| Method | Route | الوصف |
|---|---|---|
| POST | `/api/v1/payment/checkout-session` | إنشاء جلسة دفع Stripe من السلة |
| POST | `/api/v1/payment/webhook` | Webhook بيستقبله Stripe، وبيعمل الأوردر فعلياً بعد نجاح الدفع |

**ملاحظة مهمة عن الدفع:** الطلب بيتعمل فعلياً بعد تأكيد الدفع عبر الـ webhook مش
فور إنشاء جلسة الدفع، عشان نضمن إن المخزون منقصش إلا بعد ما الفلوس تتحصل فعلاً.
لازم تربط الـ webhook secret الصحيح من Stripe Dashboard (أو Stripe CLI وقت التطوير المحلي):
```bash
stripe listen --forward-to localhost:5000/api/v1/payment/webhook
```

## 🔐 المصادقة (Authentication)

كل الراوتس المحمية بتاخد التوكن في الهيدر:
```
Authorization: Bearer <token>
```
أو ممكن يتبعت كـ cookie اسمها `token` (بيتحط تلقائي عند تسجيل الدخول).

## 🗂️ هيكل المشروع

```
plant-store-api/
├── server.js              # نقطة البداية
├── config/db.js           # الاتصال بـ MongoDB
├── models/                # User, Product, Cart, Order
├── controllers/           # منطق العمل
├── routes/                # تعريف الـ endpoints
├── middleware/             # auth + error handler
├── utils/                 # AppError, generateToken
└── .env.example
```

## 🛠️ إضافات مقترحة للمستقبل
- رفع صور المنتجات فعلياً (Multer + Cloudinary/S3) بدل ما تكون روابط نصية
- نظام تقييمات ومراجعات (Reviews)
- إشعارات (Email/SMS) عند تغيير حالة الطلب
- لوحة تحكم Admin كاملة لإدارة التجار والمستخدمين
