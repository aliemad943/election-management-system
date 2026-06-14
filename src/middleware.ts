import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /api/ routes EXCEPT /api/access
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/access')) {
    const tokenCookie = request.cookies.get('election_auth');
    if (!tokenCookie) {
      return NextResponse.json(
        { error: 'غير مصرح - يرجى تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    try {
      const token = tokenCookie.value;
      const parts = token.split('.');
      if (parts.length !== 3) {
        return NextResponse.json(
          { error: 'غير مصرح - توكن غير صالح' },
          { status: 401 }
        );
      }

      // Decode JWT payload (part 2) in Edge Runtime
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = atob(payloadBase64);
      const payload = JSON.parse(decodedPayload);

      const username = payload.username;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return NextResponse.json(
          { error: 'غير مصرح - توكن غير صالح' },
          { status: 401 }
        );
      }
      // التحقق الكامل من وجود المستخدم يتم في auth-guard على مستوى الـ route

      // Check JWT expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return NextResponse.json(
          { error: 'غير مصرح - انتهت صلاحية الجلسة' },
          { status: 401 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'غير مصرح - توكن تالف أو غير صالح' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};