# منصة إدارة الماكينة الانتخابية المركزية
# Central Election Campaign Management System

نظام متكامل لإدارة الحملات الانتخابية يدعم:
- 🗳️ إدارة الناخبين والمفاتيح الانتخابية
- 🏛️ إدارة القبائل والفخود
- 📊 لوحات المؤشرات والتحليلات
- 📱 تسجيل الحضور (Check-in)
- 🔐 نظام صلاحيات متعدد الأدوار

## النشر على Railway

### الخطوة 1: رفع المشروع إلى GitHub
```bash
git init
git add .
git commit -m "Initial commit - Election Management System"
git remote add origin https://github.com/YOUR_USERNAME/election-management.git
git push -u origin main
```

### الخطوة 2: النشر على Railway
1. اذهب إلى [railway.app](https://railway.app) وسجل دخولك بحساب GitHub
2. اضغط **"New Project"**
3. اختر **"Deploy from GitHub repo"**
4. اختر المستودع الذي رفعته
5. أضف خدمة PostgreSQL:
   - اضغط **"New"** → **"Database"** → **"Add PostgreSQL"**
6. اضبط متغيرات البيئة في التبويب **"Variables"**:
   - `NEXTAUTH_SECRET` = أي نص عشوائي (32 حرف على الأقل)
   - `JWT_SECRET` = أي نص عشوائي (32 حرف على الأقل)
   - `NEXTAUTH_URL` = رابط المشروع على Railway (بعد النشر)
7. Railway سيضبط `DATABASE_URL` تلقائياً من خدمة PostgreSQL

### بيانات الدخول الافتراضية
| المستخدم | كلمة المرور | الدور |
|----------|-------------|-------|
| `admin` | `admin2024` | مدير النظام |
| `observer` | `election2024` | مراقب |
| `key_user` | `election2024` | مفتاح انتخابي |

## التطوير المحلي

```bash
# تثبيت المتطلبات
npm install

# إعداد قاعدة البيانات
npx prisma migrate dev

# تشغيل خادم التطوير
npm run dev
```

## التقنيات
- **Next.js 16** - إطار الويب
- **Prisma** - ORM لقاعدة البيانات
- **PostgreSQL** - قاعدة البيانات
- **shadcn/ui** - مكونات الواجهة
- **Tailwind CSS 4** - التصميم
