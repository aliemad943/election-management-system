// ═══════════════════════════════════════════════════════════════════════
// المنظومة الانتخابية — Prisma Client (محسّن للإنتاج مع PgBouncer)
// ═══════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // في الإنتاج: لا نسجل الاستعلامات لتقليل الحمل
    // في التطوير: نسجل كل شيء للتتبع
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
    // تحسين الاتصال مع PgBouncer
    datasourceUrl: process.env.DATABASE_URL,
  })

// في التطوير فقط: نحفظ Prisma Client في globalThis لتجنب إنشاء اتصالات متعددة
// عند hot-reload في Next.js
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db