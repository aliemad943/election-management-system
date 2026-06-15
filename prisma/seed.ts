import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء تهيئة قاعدة البيانات...');

  const existingUsersCount = await prisma.user.count();
  if (existingUsersCount > 0) {
    console.log('⚠️ قاعدة البيانات تحتوي بالفعل على مستخدمين. تم تخطي التهيئة.');
    return;
  }

  console.log('👤 إنشاء مستخدمي النظام...');
  const adminPassword = await bcrypt.hash('admin2024', 10);
  const userPassword = await bcrypt.hash('election2024', 10);

  await prisma.user.create({ data: { username: 'admin', password: adminPassword, role: 'ADMIN' } });
  await prisma.user.create({ data: { username: 'observer', password: userPassword, role: 'OBSERVER' } });
  await prisma.user.create({ data: { username: 'key_user', password: userPassword, role: 'KEY_USER' } });

  console.log('✅ تم تهيئة قاعدة البيانات بنجاح!');
}

main()
  .catch((e) => { console.error('❌ خطأ:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
