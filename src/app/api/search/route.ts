import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'search')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ voters: [], keys: [], tribes: [] });
    }

    const [voters, keys, tribes] = await Promise.all([
      db.voter.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { fatherName: { contains: q } },
            { fourthName: { contains: q } },
            { phone: { contains: q } },
          ]
        },
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandfatherName: true,
          fourthName: true,
          phone: true,
          district: true,
          status: true,
        },
        take: 5,
      }),
      db.electionKey.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { keyCode: { contains: q } },
            { phone: { contains: q } },
            { fatherName: { contains: q } },
          ]
        },
        select: {
          id: true,
          keyCode: true,
          firstName: true,
          fatherName: true,
          phone: true,
          district: true,
        },
        take: 5,
      }),
      db.tribe.findMany({
        where: {
          name: { contains: q }
        },
        select: {
          id: true,
          name: true,
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      voters: voters.map(v => ({
        ...v,
        fullName: `${v.firstName} ${v.fatherName} ${v.grandfatherName} ${v.fourthName}`.trim(),
        type: 'voter',
      })),
      keys: keys.map(k => ({
        ...k,
        fullName: `${k.firstName} ${k.fatherName}`.trim(),
        type: 'key',
      })),
      tribes: tribes.map(t => ({
        ...t,
        type: 'tribe',
      })),
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'فشل في البحث' }, { status: 500 });
  }
}