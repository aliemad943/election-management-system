import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth-guard';

// GET: Check if access is enabled (always enabled under the new User account system)
export async function GET() {
  return NextResponse.json({ enabled: true });
}

// POST: Handle login attempt or change password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password, ownerPassword, newPassword, ownerToken } = body;

    if (action === 'login') {
      // Find user by provided username
      const { username } = body;
      if (!username) {
        return NextResponse.json({ success: false, message: 'اسم المستخدم مطلوب' }, { status: 400 });
      }
      const user = await db.user.findUnique({ where: { username } });

      if (!user) {
        return NextResponse.json({ success: false, message: 'المستخدم غير موجود في النظام' }, { status: 404 });
      }

      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          getJwtSecret(),
          { expiresIn: '7d' }
        );
        const response = NextResponse.json({ success: true, token });
        response.cookies.set('election_auth', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
      }
      return NextResponse.json({ success: false, message: 'كلمة المرور غير صحيحة' }, { status: 401 });
    }

    if (action === 'owner-login') {
      // Find the admin user in the database
      const user = await db.user.findUnique({
        where: { username: 'admin' }
      });

      if (!user) {
        return NextResponse.json({ success: false, message: 'مستخدم المسؤول غير موجود في النظام' }, { status: 404 });
      }

      const match = await bcrypt.compare(ownerPassword, user.password);
      if (match) {
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          getJwtSecret(),
          { expiresIn: '7d' }
        );
        const response = NextResponse.json({ success: true, token });
        response.cookies.set('election_auth', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
      }
      return NextResponse.json({ success: false, message: 'كلمة مرور المالك غير صحيحة' }, { status: 401 });
    }

    if (action === 'change-password') {
      // Validate owner token
      if (!ownerToken) {
        return NextResponse.json({ success: false, message: 'غير مصرح - توكن مفقود' }, { status: 403 });
      }

      try {
        const decoded = jwt.verify(ownerToken, getJwtSecret()) as any;
        if (decoded.role !== 'ADMIN') {
          return NextResponse.json({ success: false, message: 'غير مصرح - ليس مسؤولاً' }, { status: 403 });
        }
      } catch (e) {
        return NextResponse.json({ success: false, message: 'غير مصرح - توكن غير صالح' }, { status: 403 });
      }

      if (!newPassword || newPassword.length < 4) {
        return NextResponse.json({ success: false, message: 'كلمة المرور قصيرة جداً' }, { status: 400 });
      }

      // Hash and update the admin user password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'toggle-access') {
      // Stub toggle-access to keep OwnerPanel happy
      return NextResponse.json({ success: true, enabled: true });
    }

    return NextResponse.json({ success: false, message: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ في النظام' }, { status: 500 });
  }
}