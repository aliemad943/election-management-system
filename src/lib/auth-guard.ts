import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import jwt from 'jsonwebtoken';

/**
 * يرجع JWT_SECRET من متغيرات البيئة، أو يرمي خطأ إن لم يكن مضبوطاً.
 * لا يوجد fallback افتراضي لأسباب أمنية.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET غير مضبوط في .env — لا يمكن تشغيل النظام بدونه');
  return secret;
}

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

export interface UserSession {
  user: SessionUser;
}

/**
 * ① requireAuth — التحقق من وجود جلسة صالحة
 * يقرأ cookie اسمها election_auth، يفك base64، يتحقق من المستخدم والصلاحية الزمنية
 */
export async function requireAuth(request: NextRequest): Promise<UserSession | NextResponse> {
  const tokenCookie = request.cookies.get('election_auth');
  if (!tokenCookie) {
    return NextResponse.json({ error: 'غير مصرح - يرجى تسجيل الدخول أولاً' }, { status: 401 });
  }

  try {
    const token = tokenCookie.value;
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    
    const username = decoded.username;

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: 'غير مصرح - المستخدم غير موجود' }, { status: 401 });
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      }
    };
  } catch {
    return NextResponse.json({ error: 'غير مصرح - توكن غير صالح أو منتهي الصلاحية' }, { status: 401 });
  }
}

/**
 * ② requireRole — التحقق من الجلسة + الدور
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<UserSession | NextResponse> {
  const session = await requireAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const userRole = session.user.role;
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'غير مسموح - صلاحيات غير كافية لهذه العملية' }, { status: 403 });
  }

  return session;
}

/**
 * ③ checkMethodPermission — التحقق من صلاحيات العملية حسب الدور والمورد
 * @param role - دور المستخدم (ADMIN, OBSERVER, KEY_USER)
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param resource - اسم المورد (voters, electoral-keys, tribes, etc.)
 * @returns true إذا كان مسموحاً
 */
/**
 * ④ withAuth — Helper wrapper for API route handlers with role-based access
 * Wraps a handler function with authentication and optional role checking
 */
export function withAuth(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>,
  roleMap?: Record<string, string[]>
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    const session = await requireAuth(req);
    if (session instanceof NextResponse) return session;

    if (roleMap) {
      const method = req.method as string;
      const allowedRoles = roleMap[method];
      if (allowedRoles && !allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: 'غير مسموح - صلاحيات غير كافية' }, { status: 403 });
      }
    }

    return handler(req, ctx);
  };
}

export function checkMethodPermission(role: string, method: string, resource: string): boolean {
  // ADMIN: صلاحيات كاملة
  if (role === 'ADMIN') return true;

  // OBSERVER: قراءة فقط
  if (role === 'OBSERVER') {
    return method === 'GET';
  }

  // KEY_USER: صلاحيات محدودة حسب المورد
  if (role === 'KEY_USER') {
    switch (resource) {
      case 'voters':
        // يمكن لمستخدم المفتاح: عرض، إضافة، تعديل الناخبين — لكن لا حذف
        return ['GET', 'POST', 'PUT'].includes(method);
      case 'electoral-keys':
      case 'tribes':
      case 'search':
      case 'commission-data':
      case 'ihec-data':
        // عرض فقط
        return method === 'GET';
      default:
        // باقي الموارد: لا صلاحية
        return false;
    }
  }

  return false;
}