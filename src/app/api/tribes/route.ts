import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'tribes')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');

    const tribes = await db.tribe.findMany({
      include: {
        subTribes: true,
        voters: true,
        electionKeys: true,
      },
    });

    const tribesWithStats = tribes.map((tribe) => {
      const voterCount = tribe.voters.length;
      const votedCount = tribe.voters.filter((v) => v.votedOnDay).length;
      const avgConfidence = voterCount > 0
        ? Math.round((tribe.voters.reduce((sum, v) => sum + v.supportDegree, 0) / voterCount) * 10) / 10
        : 0;

      return {
        id: tribe.id,
        name: tribe.name,
        leaderName: 'شيخ العشيرة',
        leaderPhone: '',
        influence: 3,
        governorate: 'ذي قار',
        district: district || 'الغراف',
        notes: `تحتوي على ${tribe.subTribes.length} فخذ/بيت مضاف`,
        voterCount,
        votedCount,
        votedPercentage: voterCount > 0 ? Math.round((votedCount / voterCount) * 100) : 0,
        avgConfidence,
        subTribes: tribe.subTribes,
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(tribesWithStats);
  } catch (error) {
    console.error('Error fetching tribes:', error);
    return NextResponse.json({ error: 'فشل في جلب العشائر' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'POST', 'tribes')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }
    const body = await request.json();
    const { name, subTribes } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم العشيرة مطلوب' }, { status: 400 });
    }

    const existingTribe = await db.tribe.findUnique({ where: { name } });
    if (existingTribe) {
      return NextResponse.json({ error: 'العشيرة مسجلة مسبقاً' }, { status: 409 });
    }

    const tribe = await db.tribe.create({
      data: {
        name,
        subTribes: subTribes ? {
          create: subTribes.map((st: string) => ({ name: st }))
        } : undefined,
      },
      include: { subTribes: true }
    });

    return NextResponse.json(tribe, { status: 201 });
  } catch (error) {
    console.error('Error creating tribe:', error);
    return NextResponse.json({ error: 'فشل في إنشاء العشيرة' }, { status: 500 });
  }
}